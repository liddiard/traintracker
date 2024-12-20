import cn from 'classnames'
import { useEffect, useState } from 'react'

const Progress = ({
  percent = 0,
  classNames = {},
  id = '',
  vertical = false,
  progressValueRef,
}: {
  percent: number
  classNames?: { outer?: string; inner?: string }
  id?: string
  vertical?: boolean
  progressValueRef?: React.RefObject<HTMLDivElement>
}) => {
  const [isClient, setIsClient] = useState(false)
  const horizontalClassNames =
    'h-4 w-full before-after:top-0 before:left-1 after:right-1'
  const verticalClassNames =
    'w-4 h-full before-after:left-0 before:top-1 after:bottom-1 flex-col'

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
        height: `${progressPercent}%`,
      }
    : {
        width: `${progressPercent}%`,
        minWidth: '1.05rem',
      }
  return (
    <div
      id={id}
      className={cn(
        'relative flex items-center justify-between p-[0.15rem] rounded-full appearance-none bg-positron-gray-200 before-after:content-[""] before-after:block before-after:z-10 before-after:bg-white before-after:w-3 before-after:aspect-square before-after:shrink-0 before-after:rounded-full',
        vertical ? verticalClassNames : horizontalClassNames,
        classNames.outer,
      )}
    >
      <div
        style={innerStyle}
        className={cn(
          'absolute left-0 top-0 h-full w-full rounded-full transition-all duration-[15s] ease-linear bg-amtrak-blue-500',
          classNames.inner,
        )}
        ref={progressValueRef}
      />
    </div>
  )
}

export default Progress
