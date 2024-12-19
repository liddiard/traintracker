import cn from 'classnames'
import { useEffect, useState } from 'react'

const Progress = ({
  percent = 0,
  className = '',
  id = '',
  progressValueRef,
}: {
  percent: number
  className?: string
  id?: string
  progressValueRef?: React.RefObject<HTMLDivElement>
}) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // prevent hydration error with progress bar width not exactly matching
    // in the time it takes to be rendered between client and server
    return null
  }

  return (
    <div
      id={id}
      className={cn(
        className,
        'relative flex items-center justify-between p-[0.15rem] w-full rounded-full appearance-none h-4 bg-positron-gray-200 before-after:content-[""] before-after:block before-after:z-10 before-after:bg-white before-after:w-3 before-after:aspect-square before-after:shrink-0 before-after:rounded-full before-after:top-0 before:left-1 after:right-1',
      )}
    >
      <div
        style={{
          width: `${Math.min(percent, 1) * 100}%`,
          minWidth: '1rem',
        }}
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-[15s] ease-linear bg-amtrak-blue-500"
        ref={progressValueRef}
      />
    </div>
  )
}

export default Progress
