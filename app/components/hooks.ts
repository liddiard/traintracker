import { useEffect, useRef, useState, useCallback } from 'react'
import type { ActiveSubscription, NotificationType } from '@/app/types'
import { useSettings } from '../providers/settings'
import { urlBase64ToUint8Array } from '../utils'

// access the previous value of a prop inside a component
// https://stackoverflow.com/a/57706747
export const usePrevious = <T>(value: T): T | null => {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current = value
  })
  // eslint-disable-next-line react-hooks/refs
  return ref.current
}

export interface AnimatedPosition {
  coordinates: number[]
  heading: number | null
}

/**
 * Hook that smoothly animates between coordinate/heading positions over time.
 *
 * @param coordinates - Target coordinates [lng, lat]
 * @param heading - Target heading in degrees (optional, defaults to 0)
 * @param duration - Animation duration in ms
 * @param skipAnimation - If true, immediately jump to new position without animating
 * @returns Current animated position, or null if no coordinates provided yet
 */
export const useAnimatedPosition = (
  coordinates: number[] | null,
  heading: number | null,
  duration: number,
  skipAnimation: boolean = false,
): AnimatedPosition | null => {
  const [animPosition, setAnimPosition] = useState<AnimatedPosition | null>(
    null,
  )

  // Use refs to track animation state without triggering re-renders
  const animFrameId = useRef<number | null>(null)
  const animStartTime = useRef<number | null>(null)
  const fromPosition = useRef<AnimatedPosition | null>(null)
  const toPosition = useRef<AnimatedPosition | null>(null)

  useEffect(() => {
    if (!coordinates) {
      return
    }

    // If we don't have an animated position yet, initialize without animating
    if (!animPosition) {
      setAnimPosition({ coordinates, heading })
      return
    }

    // If skipAnimation is true, jump immediately without animating
    if (skipAnimation) {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current)
        animFrameId.current = null
      }
      setAnimPosition({ coordinates, heading })
      // Set fromPosition so next animation starts from here
      fromPosition.current = { coordinates, heading }
      return
    }

    // Store the current animated position as the starting point
    fromPosition.current = {
      coordinates: animPosition.coordinates,
      heading: animPosition.heading,
    }
    toPosition.current = { coordinates, heading }
    animStartTime.current = performance.now()

    // Cancel any existing animation before starting a new one
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current)
    }

    // Animation loop using refs to avoid stale closures
    const animate = () => {
      if (
        !animStartTime.current ||
        !fromPosition.current ||
        !toPosition.current
      ) {
        return
      }

      const elapsed = performance.now() - animStartTime.current

      // Stop animation after duration
      if (elapsed >= duration) {
        setAnimPosition({
          coordinates: toPosition.current.coordinates,
          heading: toPosition.current.heading,
        })
        animFrameId.current = null
        return
      }

      const progress = elapsed / duration
      const from = fromPosition.current
      const to = toPosition.current

      // Calculate interpolated position
      const dx = to.coordinates[0] - from.coordinates[0]
      const dy = to.coordinates[1] - from.coordinates[1]
      const dr = to.heading && from.heading ? to.heading - from.heading : 0

      setAnimPosition({
        coordinates: [
          from.coordinates[0] + dx * progress,
          from.coordinates[1] + dy * progress,
        ],
        heading: (from.heading ?? 0) + dr * progress,
      })

      animFrameId.current = requestAnimationFrame(animate)
    }

    animFrameId.current = requestAnimationFrame(animate)

    // Cleanup: cancel animation on unmount or when coordinates change
    return () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current)
        animFrameId.current = null
      }
    }
    // Only re-run when the actual coordinate values change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates?.[0], coordinates?.[1], heading, duration, skipAnimation])

  return animPosition
}

// Push notifications manager
export const useNotifications = () => {
  // check support on initial render
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  // whether or not the user has granted notification permissio
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (isSupported && typeof Notification !== 'undefined') {
      return Notification.permission
    }
    return 'default'
  })

  const { settings } = useSettings()
  const { timeFormat } = settings
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [])

  // create a push notification subscription
  const subscribe = useCallback(
    async (trainId: string, stopCode: string, type: NotificationType) => {
      const registration = await navigator.serviceWorker.ready

      // get VAPID public key
      const { publicKey } = await fetch('/api/notifications/vapid-key').then(
        (r) => r.json(),
      )

      // create subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // send to server
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          trainId,
          stopCode,
          notificationType: type,
          timeFormat,
          userTz,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to subscribe')
      }
    },
    [timeFormat, userTz],
  )

  // delete a push notification subscription
  const unsubscribe = useCallback(
    async (trainId: string, stopCode: string, type: NotificationType) => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) return

      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          trainId,
          stopCode,
          notificationType: type,
        }),
      })
    },
    [],
  )

  // get notification subscriptions for current device + train
  const getActiveSubscriptions = useCallback(
    async (trainId: string): Promise<ActiveSubscription[]> => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) return []

      const params = new URLSearchParams({
        endpoint: subscription.endpoint,
        trainId,
      })

      const response = await fetch(`/api/notifications?${params}`)

      const data = await response.json()
      return data.subscriptions
    },
    [],
  )

  return {
    permission,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    getActiveSubscriptions,
  }
}
