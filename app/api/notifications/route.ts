import { MAX_PUSH_SUBSCRIPTIONS } from '@/app/constants'
import { prisma } from '@/app/lib/prisma'
import type { ActiveSubscription } from '@/app/types'

// check active notifications for a device + train
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const trainId = searchParams.get('trainId')

    if (!endpoint || !trainId) {
      return Response.json(
        { error: 'Missing required parameters: endpoint and trainId' },
        { status: 400 },
      )
    }

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
    return Response.json(
      { error: error.message || 'Failed to check subscriptions' },
      { status: 500 },
    )
  }
}

// create a notification subscription
export async function POST(request: Request) {
  try {
    const {
      subscription,
      trainId,
      stopCode,
      notificationType,
      timeFormat,
      userTz,
    } = await request.json()

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
    return Response.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 },
    )
  }
}

// remove a notification subscription
export async function DELETE(request: Request) {
  try {
    const { endpoint, trainId, stopCode, notificationType } =
      await request.json()

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, trainId, stopCode, notificationType },
    })

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[API] Unsubscribe error:', error)
    return Response.json(
      { error: error.message || 'Failed to unsubscribe' },
      { status: 500 },
    )
  }
}
