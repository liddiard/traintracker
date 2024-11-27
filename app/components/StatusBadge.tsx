import cn from 'classnames'

import { TrainStatus, TimeStatus } from '../types'

function StatusBadge({
  status,
  className,
}: {
  status: TrainStatus
  className?: string
}) {
  const { code, deviation } = status
  let color, text
  switch (code) {
    case TimeStatus.PREDEPARTURE:
      color = 'bg-amtrak-indigo-600'
      text = 'Pre-departure'
      break
    case TimeStatus.ON_TIME:
      color = 'bg-amtrak-green-600'
      text = 'On Time'
      break
    case TimeStatus.DELAYED:
      color = 'bg-amtrak-yellow-700'
      text = 'Late'
      break
    case TimeStatus.COMPLETE:
      color = 'bg-amtrak-blue-600'
      text = 'Completed'
      break
    default:
      color = 'bg-gray-600'
      text = 'Unknown'
      break
  }
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn('px-3 py-1 rounded-full text-white font-semibold', color)}
      >
        {text}
      </span>
      {deviation && deviation > 0 ? (
        <span className="font-normal">{deviation} min</span>
      ) : null}
    </div>
  )
}

export default StatusBadge
