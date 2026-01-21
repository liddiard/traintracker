import { MAX_PUSH_SUBSCRIPTIONS } from '@/app/constants'
import { prisma } from '@/app/lib/prisma'
import type { ActiveSubscription } from '@/app/types'
import { z } from 'zod'

// Validation schemas
const getParamsSchema = z.object({
  endpoint: z.string().min(1, 'endpoint cannot be empty'),
  trainId: z.string().min(1, 'trainId cannot be empty'),
})

const postBodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().min(1, 'subscription.endpoint cannot be empty'),
    keys: z.object({
      p256dh: z.string().min(1, 'subscription.keys.p256dh cannot be empty'),
      auth: z.string().min(1, 'subscription.keys.auth cannot be empty'),
    }),
  }),
  trainId: z.string().min(1, 'trainId cannot be empty'),
  stopCode: z.string().min(1, 'stopCode cannot be empty'),
  notificationType: z.enum(['arrival', 'departure']),
  timeFormat: z.enum(['hr12', 'hr24']),
  userTz: z.string().min(1, 'userTz cannot be empty'),
})

const deleteBodySchema = z.object({
  endpoint: z.string().min(1, 'endpoint cannot be empty'),
  trainId: z.string().min(1, 'trainId cannot be empty'),
  stopCode: z.string().min(1, 'stopCode cannot be empty'),
  notificationType: z.enum(['arrival', 'departure']),
})

// check active notifications for a device + train
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const params = {
    endpoint: searchParams.get('endpoint'),
    trainId: searchParams.get('trainId'),
  }

  // Validate query parameters
  const validation = getParamsSchema.safeParse(params)
  if (!validation.success) {
    return Response.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const { endpoint, trainId } = validation.data

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { endpoint, trainId, sent: false },
    })

    const activeSubscriptions: ActiveSubscription[] = subscriptions.map(
      (s) => ({
        stopCode: s.stopCode,
        notificationType: s.notificationType,
      }),
    )

    return Response.json({ subscriptions: activeSubscriptions })
  } catch (error: any) {
    console.error('[API] Check subscriptions error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// create a notification subscription
export async function POST(request: Request) {
  let body: any

  // Parse JSON body
  try {
    body = await request.json()
  } catch (error) {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  // Validate request body
  const validation = postBodySchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const {
    subscription,
    trainId,
    stopCode,
    notificationType,
    timeFormat,
    userTz,
  } = validation.data

  try {
    // Check subscription limit per device
    const existingCount = await prisma.pushSubscription.count({
      where: {
        endpoint: subscription.endpoint,
        sent: false,
      },
    })

    if (existingCount >= MAX_PUSH_SUBSCRIPTIONS) {
      return Response.json(
        {
          error: `Maximum of ${MAX_PUSH_SUBSCRIPTIONS} active subscriptions per device`,
        },
        { status: 400 },
      )
    }

    // Create subscription
    await prisma.pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        trainId,
        stopCode,
        notificationType,
        timeFormat,
        userTz,
      },
    })

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[API] Subscribe error:', error)

    // Handle unique constraint violation (P2002)
    // https://www.prisma.io/docs/orm/reference/error-reference#p2002
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'Subscription already exists' },
        { status: 409 },
      )
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// remove a notification subscription
export async function DELETE(request: Request) {
  let body: any

  // Parse JSON body
  try {
    body = await request.json()
  } catch (error) {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  // Validate request body
  const validation = deleteBodySchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const { endpoint, trainId, stopCode, notificationType } = validation.data

  try {
    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint, trainId, stopCode, notificationType },
    })

    if (result.count === 0) {
      return Response.json(
        { error: 'No subscription found matching the provided parameters' },
        { status: 404 },
      )
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[API] Unsubscribe error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
