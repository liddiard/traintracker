import cn from 'classnames'
import { useEffect, useState } from 'react'
import { MIN_PROGRESS_PX } from '../constants'

function Progress({
  percent = 0,
  px,
  classNames = {},
  id = '',
  vertical = false,
  showEndpoints = true,
  progressValueRef,
  ...props
}: {
  percent?: number
  px?: number
  classNames?: { outer?: string; inner?: string }
  id?: string
  vertical?: boolean
  showEndpoints?: boolean
  progressValueRef?: React.RefObject<HTMLDivElement | null>
}) {
  const [isClient, setIsClient] = useState(false)
  const internalClassNames = {
    horizontal: 'h-4 w-full before-after:top-0',
    vertical: 'w-4 h-full before-after:left-0 flex-col',
    endpoints:
      'before-after:content-[""] before-after:block before-after:z-10 before-after:bg-white before-after:w-3 before-after:aspect-square before-after:shrink-0 before-after:rounded-full',
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // prevent hydration error with progress bar width not exactly matching
    // in the time it takes to be rendered between client and server
    return null
  }

  const progressPercent = Math.min(percent, 1) * 100
  const innerStyle = vertical
    ? {
        height: px ?? `${progressPercent}%`,
      }
    : {
        width: px ?? `${progressPercent}%`,
        minWidth: MIN_PROGRESS_PX,
      }
  return (
    <div
      id={id}
      className={cn(
        'bg-positron-gray-200 dark:bg-positron-gray-600 relative flex appearance-none items-center justify-between rounded-full p-0.5',
        showEndpoints ? internalClassNames.endpoints : '',
        vertical ? internalClassNames.vertical : internalClassNames.horizontal,
        classNames.outer,
      )}
      {...props}
    >
      <div
        style={innerStyle}
        className={cn(
          'bg-amtrak-blue-500 absolute top-0 left-0 h-full w-full rounded-full transition-all duration-[15s] ease-linear',
          classNames.inner,
        )}
        ref={progressValueRef}
      />
    </div>
  )
}

export default Progress
