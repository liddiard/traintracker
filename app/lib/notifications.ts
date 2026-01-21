import { prisma } from './prisma'
import { sendPushNotification } from './webpush'
import { formatTime, formatTrainResponse } from '@/app/utils'
import type {
  Train,
  TrainResponse,
  Stop,
  NotificationPayload,
  NotificationType,
  TimeFormat,
} from '@/app/types'

let isPolling = false

const getBaseUrl = () => {
  // For server-side internal API calls, always use localhost
  // This works in both local dev and Docker containers
  // Use INTERNAL_API_URL env var to override if needed
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL
  }
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}`
}

export async function pollAndNotify() {
  if (isPolling) return // Prevent concurrent polls
  isPolling = true

  try {
    // Fetch latest train data
    const response = await fetch(`${getBaseUrl()}/api/trains`)
    if (!response.ok) {
      console.error('[Notifications] Failed to fetch trains:', response.status)
      return
    }
    const trainResponse: TrainResponse = await response.json()
    const trains: Train[] = formatTrainResponse(trainResponse)

    // Get unsent subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { sent: false },
    })

    const now = new Date()

    // Check for push notifications to send
    for (const sub of subscriptions) {
      const train = trains.find((t) => t.id === sub.trainId)
      if (!train) continue

      const stop = train.stops.find((s) => s.code === sub.stopCode)
      if (!stop) continue

      // Check if notification should be sent
      const targetTime =
        sub.notificationType === 'arrival'
          ? stop.arrival.time
          : stop.departure.time

      if (new Date(targetTime) <= now) {
        // time criteria met to send this notification
        try {
          const payload = createNotificationPayload(
            train,
            stop,
            sub.notificationType as NotificationType,
            sub.timeFormat,
            sub.userTz,
          )

          await sendPushNotification(sub, payload)

          console.log(
            `[Notifications] Sent notification for train ${train.id} at ${stop.code}`,
          )

          // Mark as sent
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { sent: true },
          })
        } catch (error: any) {
          console.error(
            `[Notifications] Failed to send notification for ${sub.id}:`,
            error.message,
          )

          // Clean up expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Notifications] Subscription expired: ${sub.id}`)
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
        }
      }
    }
  } catch (error) {
    console.error('[Notifications] Polling error:', error)
  } finally {
    isPolling = false
  }
}

function createNotificationPayload(
  train: Train,
  stop: Stop,
  type: NotificationType,
  timeFormat: TimeFormat,
  userTz: string,
): NotificationPayload {
  const event = type === 'arrival' ? stop.arrival : stop.departure
  const timeStr = formatTime(event.time, { timeFormat, tz: userTz })
  const action = type === 'arrival' ? 'Arrived at' : 'Departed'
  const delayStr = event.delay > 0 ? ` (${event.delay} min late)` : ''

  return {
    title: `🚆 ${train.name} ${train.number}`,
    body: `${action} ${stop.name} at ${timeStr}${delayStr}`,
    icon: '/img/train-circle.svg', // TODO: update with app icon
    badge: '/img/train-circle.svg', // TODO: update with app icon
    tag: `${train.id}-${stop.code}-${type}`,
    data: {
      url: `/train/${train.id}`,
      trainId: train.id,
      stopCode: stop.code,
    },
    actions: [{ action: 'view', title: 'View Train' }],
  }
}

// Initialize polling
let pollInterval: NodeJS.Timeout | null = null

export function startPolling() {
  if (pollInterval) return
  console.log('[Notifications] Starting notification polling')
  pollInterval = setInterval(pollAndNotify, 30 * 1000) // 30 seconds
  pollAndNotify() // run immediately
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    console.log('[Notifications] Stopped notification polling')
  }
}
