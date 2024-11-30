import cn from 'classnames'
import interpolate from 'color-interpolate'

import { TrainStatus, TimeStatus } from '../types'

function StatusBadge({
  status,
  className,
}: {
  status: TrainStatus
  className?: string
}) {
  // const delayPalette = interpolate(['#7d8d29', '#ab7a00', '#ff4018', '#ab1e00'])
  const delayPalette = interpolate(['#7d8d29', '#ff4018', '#ab1e00'])
  const timeFormatter = Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
  })
  const maxDeviation = 60 * 2 // minutes
  const { code, deviation, firstStation, lastStation } = status
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
      colorValue = deviation
        ? delayPalette(Math.min(deviation, maxDeviation) / maxDeviation)
        : delayPalette(0)
      text = 'Late'
      break
    case TimeStatus.COMPLETE:
      colorClass = 'bg-amtrak-deep-blue'
      text = 'Arrived'
      break
    default:
      colorClass = 'bg-gray-600'
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
      {code === TimeStatus.PREDEPARTURE ? (
        <span>{timeFormatter.format(firstStation.dep)}</span>
      ) : null}
      {code === TimeStatus.DELAYED ? <span>{deviation} min</span> : null}
      {code === TimeStatus.COMPLETE ? (
        <span>{timeFormatter.format(lastStation.arr)}</span>
      ) : null}
    </div>
  )
}

export default StatusBadge
