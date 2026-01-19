// Activate immediately when installed (don't wait for old SW to stop)
self.addEventListener('install', () => {
  console.log('[Service Worker] Installing...')
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
  self.skipWaiting()
})

// Take control of all pages immediately
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated')
  // https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', async (event) => {
  console.log('[Service Worker] Push event received:', event)

  try {
    if (!event.data) {
      console.warn('[Service Worker] Push event has no data')
      return
    }

    const data = event.data.json()
    console.log('[Service Worker] Push data:', data)

    event.waitUntil(
      self.registration
        .showNotification(data.title, {
          body: data.body,
          icon: data.icon,
          badge: data.badge,
          tag: data.tag,
          data: data.data,
          actions: data.actions,
          requireInteraction: false,
        })
        .then(() => {
          console.log('[Service Worker] Notification shown successfully')
        })
        .catch((error) => {
          console.error('[Service Worker] Failed to show notification:', error)
        }),
    )
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
