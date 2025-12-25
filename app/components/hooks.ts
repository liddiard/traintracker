import { useEffect, useRef, useState } from 'react'

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
  coordinates: [number, number]
  heading: number
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
  coordinates: [number, number] | null,
  heading: number = 0,
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
      const dr = to.heading - from.heading

      setAnimPosition({
        coordinates: [
          from.coordinates[0] + dx * progress,
          from.coordinates[1] + dy * progress,
        ],
        heading: from.heading + dr * progress,
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
