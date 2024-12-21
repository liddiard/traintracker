import cn from 'classnames'

import { TimeStatus, Train } from '@/app/types'
import {
  formatDuration,
  formatTime,
  getDelayColor,
  getTrainStatus,
} from '@/app/utils'

function StatusBadge({
  train,
  className,
}: {
  train: Train
  className?: string
}) {
  const { code, deviation, firstStation, lastStation } = getTrainStatus(train)

  let colorClass, colorValue, text
  switch (code) {
    case TimeStatus.PREDEPARTURE:
      colorClass = 'bg-amtrak-blue-600'
      text = 'Scheduled'
      break
    case TimeStatus.ON_TIME:
      colorClass = 'bg-amtrak-green-600'
      text = 'On Time'
      break
    case TimeStatus.DELAYED:
      colorValue = getDelayColor(deviation ?? 0)
      text = 'Late'
      break
    case TimeStatus.COMPLETE:
      colorClass = 'bg-amtrak-deep-blue'
      text = 'Arrived'
      break
    default:
      colorClass = 'bg-positron-gray-600'
      text = 'Unknown'
      break
  }
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'px-3 py-1 rounded-full text-white font-semibold cursor-default',
          colorClass,
        )}
        style={{
          backgroundColor: colorValue,
        }}
      >
        {text}
      </span>
      {code === TimeStatus.PREDEPARTURE && firstStation.dep ? (
        <span>{formatTime(firstStation.dep, firstStation.tz)}</span>
      ) : null}
      {code === TimeStatus.DELAYED ? (
        <span>{formatDuration(deviation ?? 0, { shortenMins: true })}</span>
      ) : null}
      {code === TimeStatus.COMPLETE && lastStation.arr ? (
        <span>{formatTime(lastStation.arr, lastStation.tz)}</span>
      ) : null}
    </div>
  )
}

export default StatusBadge
