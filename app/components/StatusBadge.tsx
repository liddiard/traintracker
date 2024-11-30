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
  const maxDeviation = 60 * 2 // minutes
  const { code, deviation } = status
  let colorClass, colorValue, text
  switch (code) {
    case TimeStatus.PREDEPARTURE:
      colorClass = 'bg-amtrak-indigo-600'
      text = 'Pre-departure'
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
      colorClass = 'bg-amtrak-blue-600'
      text = 'Completed'
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
          'px-3 py-1 rounded-full text-white font-semibold',
          colorClass,
        )}
        style={{
          backgroundColor: colorValue,
        }}
      >
        {text}
      </span>
      {deviation && deviation > 0 ? <span>{deviation} min</span> : null}
    </div>
  )
}

export default StatusBadge
