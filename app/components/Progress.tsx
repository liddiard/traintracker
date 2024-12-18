import cn from 'classnames'

const Progress = ({ percent = 0, className = '', id = '' }) => (
  <progress
    id="segmentProgress"
    value={percent}
    max={1}
    className={cn(
      className,
      'relative w-full progress-unfilled:rounded-full progress-unfilled:appearance-none h-4 progress-unfilled:bg-positron-gray-200 progress-filled:bg-amtrak-blue-500 progress-filled:rounded-full progress-filled:transition-all before-after:content-[""] before-after:block before-after:absolute before-after:bg-white before-after:w-4 before-after:aspect-square before-after:rounded-full before-after:top-0 before-after:border-2 before:left-0 before:border-amtrak-blue-500 after:right-0 after:border-positron-gray-200',
    )}
  />
)

export default Progress
