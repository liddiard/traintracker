'use client'

import { ReactNode, useRef, useEffect, useCallback, useState } from 'react'
import { Sheet, SheetRef, useScrollPosition } from 'react-modal-sheet'
import { MOBILE_BREAKPOINT } from '../constants'
import { useBottomSheet } from '../providers/bottomSheet'
import { BottomSheetPosition } from '../types'
import { keyMirror } from '../utils'

interface BottomSheetProps {
  children: ReactNode
}

const positionToIndex: Record<BottomSheetPosition, number> = {
  bottom: 1,
  middle: 2,
  top: 3,
}
const indexToPosition = keyMirror(positionToIndex)
const initialSnap = positionToIndex.middle

export default function BottomSheet({ children }: BottomSheetProps) {
  // whether or not the screen is narrow enough to render the bottom sheet
  // default to null (unknown) to avoid hydration mismatch. we don't know the screen
  // width until we're on the client. sheet will only render after mount.
  const [isWideScreen, setIsWideScreen] = useState<boolean | null>(null)

  // external components can request the bottom sheet to be snapped to a specific
  // position (bottom, middle, or top)
  const { position, setPosition, setSheetTop } = useBottomSheet()

  // vertical coordinate of a swipe start gesture
  const touchStartY = useRef<number | null>(null)

  // Track whether we've decided to prevent scroll for the current gesture.
  // null = undecided, true = prevent scroll, false = allow scroll
  const preventScrollForGesture = useRef<boolean | null>(null)

  // Allow react-modal-sheet to track the scroll position of our custom scroller
  // https://github.com/Temzasse/react-modal-sheet/blob/main/src/hooks/use-scroll-position.ts
  const { scrollRef, scrollPosition } = useScrollPosition({ isEnabled: true })

  const sheetRef = useRef<SheetRef>(null)

  // Ref to attach non-passive event listeners and to access `scrollTop` in `useEffect`
  // hook below without adding `scrollPosition` dependency
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Track current snap point as a ref to avoid adding a dependency to `useEffect` hook
  // below
  const currentSnapRef = useRef<number>(initialSnap)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Combined ref callback
  const setScrollerRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el
      scrollRef(el)
    },
    [scrollRef],
  )

  // Track window size to determine whether or not to render the bottom sheet.
  // Also set initial value on mount to avoid hydration mismatch - Sheet component uses
  // the Motion library for animations which has different states on server vs client.
  useEffect(() => {
    const handleWindowResize = () => {
      setIsWideScreen(window.innerWidth > MOBILE_BREAKPOINT)
    }
    // set initial value on mount
    handleWindowResize()
    window.addEventListener('resize', handleWindowResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  useEffect(() => {
    sheetRef.current?.snapTo(positionToIndex[position])
  }, [position])

  // Attach non-passive touch event listeners because React's `onTouchMove` is passive
  // and can't be changed, so preventDefault() doesn't work
  // See:
  // - https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#using_passive_listeners
  // - https://github.com/facebook/react/issues/22794
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      // Reset scroll-locking decision for new gesture - null means "not yet decided"
      preventScrollForGesture.current = null
    }

    const handleTouchMove = (e: TouchEvent) => {
      // If we've already decided to prevent scroll for this gesture,
      // keep preventing it on every touchmove event
      if (preventScrollForGesture.current) {
        e.preventDefault()
        return
      }

      // If we've decided to allow scroll, or if we didn't record a touchstart
      // reference point, let the scroll happen
      if (
        preventScrollForGesture.current === false ||
        touchStartY.current === null
      ) {
        return
      }

      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartY.current

      // Wait for a minimum movement threshold before making a decision
      // This prevents jittery behavior from tiny movements
      if (Math.abs(deltaY) < 5) {
        return
      }

      const isSwipingDown = deltaY > 0

      // we're at the top of the scrollable content
      const isAtTop = scroller.scrollTop <= 0
      // sheet is at the topmost snap point
      const isFullyOpen = currentSnapRef.current === positionToIndex.top

      // Decide whether to prevent scroll for this entire gesture:
      // 1. When not fully open: always prevent scroll (sheet should drag)
      // 2. When fully open, at scroll top, and swiping down: prevent scroll
      const shouldPrevent =
        !isFullyOpen || (isFullyOpen && isAtTop && isSwipingDown)

      // Lock in the decision for the rest of this gesture
      preventScrollForGesture.current = shouldPrevent

      if (shouldPrevent) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      // Reset state for the next gesture
      touchStartY.current = null
      preventScrollForGesture.current = null
    }

    scroller.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })
    // Use a non-passive listener so preventDefault() works
    scroller.addEventListener('touchmove', handleTouchMove, { passive: false })
    scroller.addEventListener('touchend', handleTouchEnd, { passive: true })
    scroller.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      scroller.removeEventListener('touchstart', handleTouchStart)
      scroller.removeEventListener('touchmove', handleTouchMove)
      scroller.removeEventListener('touchend', handleTouchEnd)
      scroller.removeEventListener('touchcancel', handleTouchEnd)
    }
    // Re-run when `isWideScreen` changes from null to false, since that's when
    // the Sheet mounts and the scroller element becomes available
  }, [isWideScreen])

  const handleSnap = (snapIndex: number) => {
    currentSnapRef.current = snapIndex
    // keep sheet position in sync with context
    setPosition(indexToPosition[snapIndex])
    setSheetTop(sheetRef.current?.yInverted.get() ?? 0)
  }

  // Disable drag when scrolled away from top (so content can scroll freely)
  // `scrollPosition` is undefined when content isn't scrollable
  const shouldDisableDrag =
    scrollPosition !== 'top' && scrollPosition !== undefined

  // Don't render until we know the screen width (avoids hydration mismatch),
  // or if the screen is wide
  if (isWideScreen === null || isWideScreen) {
    return null
  }

  return (
    <Sheet
      isOpen={true}
      onClose={() => {}}
      snapPoints={[0, 125, 0.5, 1]}
      initialSnap={initialSnap}
      disableDismiss={true}
      onSnap={handleSnap}
      tweenConfig={{
        duration: 0.25,
        ease: 'circOut',
      }}
      prefersReducedMotion={prefersReducedMotion}
      ref={sheetRef}
    >
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content
          // Disable library's scroll handling - we're using a custom scroller
          disableScroll
          disableDrag={shouldDisableDrag}
        >
          {/* Custom scroller
           * https://github.com/Temzasse/react-modal-sheet/tree/main?tab=readme-ov-file#creating-custom-scrollers
           */}
          <div
            ref={setScrollerRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            className="dark:bg-positron-gray-800 dark:text-white"
          >
            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  )
}
