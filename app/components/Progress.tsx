import cn from 'classnames'

const Progress = ({ percent = 0, className = '', id = '' }) => (
  <progress
    id={id}
    value={percent}
    max={1}
    className={cn(
      className,
      'relative flex items-center p-[0.15rem] w-full progress-unfilled:rounded-full progress-unfilled:appearance-none h-4 progress-unfilled:bg-positron-gray-200 progress-filled:bg-amtrak-blue-500 progress-filled:absolute progress-filled:left-0 progress-filled:top-0 progress-filled:min-w-4 progress-filled:rounded-full progress-filled:transition-all progress-filled:duration-[15s] progress-filled:ease-linear before-after:content-[""] before-after:block before-after:z-10 before-after:bg-white before-after:w-3 before-after:aspect-square before-after:shrink-0 before-after:rounded-full before-after:top-0 before:left-1 after:right-1',
    )}
  />
)

export default Progress
