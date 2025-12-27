import webpush from 'web-push'

// Validate that required environment variables are defined
const requiredEnvVars = [
  'VAPID_SUBJECT',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
]
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])
if (missingEnvVars.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`,
  )
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

/**
 * Sends a push notification to a client.
 *
 * @param subscription The push subscription object, containing the endpoint and keys.
 * @param payload The data to send in the notification.
 * @returns A promise that resolves with the result of the send notification request.
 * @throws Will throw an error if the notification fails to send.
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: any,
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }

  console.log('[WebPush] Sending notification to:', subscription.endpoint)
  console.log('[WebPush] Payload:', JSON.stringify(payload, null, 2))

  try {
    const result = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 }, // attempt to send for 1 hour
    )
    console.log(
      '[WebPush] Notification sent successfully, status:',
      result.statusCode,
    )
    return result
  } catch (error: any) {
    console.error('[WebPush] Failed to send notification:', error.message)
    console.error('[WebPush] Error details:', {
      statusCode: error.statusCode,
      headers: error.headers,
      body: error.body,
    })
    throw error
  }
}
