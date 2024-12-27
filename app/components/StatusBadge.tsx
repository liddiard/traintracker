import cn from 'classnames'

import { TimeStatus, Train } from '@/app/types'
import {
  formatDuration,
  formatTime,
  getTrainColor,
  getTrainStatus,
} from '@/app/utils'

function StatusBadge({
  train,
  className,
}: {
  train: Train
  className?: string
}) {
  const trainStatus = getTrainStatus(train)
  const backgroundColor = getTrainColor(trainStatus)
  const { code, deviation, firstStation, lastStation } = trainStatus

  let text
  switch (code) {
    case TimeStatus.PREDEPARTURE:
      text = 'Scheduled'
      break
    case TimeStatus.ON_TIME:
      text = 'On Time'
      break
    case TimeStatus.DELAYED:
      text = 'Late'
      break
    case TimeStatus.COMPLETE:
      text = 'Arrived'
      break
    default:
      text = 'Unknown'
      break
  }

  const getTimeInfo = () => {
    if (code === TimeStatus.PREDEPARTURE && firstStation.dep) {
      return formatTime(firstStation.dep, firstStation.tz)
    } else if (code === TimeStatus.DELAYED) {
      return formatDuration(deviation ?? 0, { shortenMins: true })
    } else if (code === TimeStatus.COMPLETE && lastStation.arr) {
      return formatTime(lastStation.arr, lastStation.tz)
    }
  }

  const timeInfo = getTimeInfo()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className="cursor-default rounded-full px-3 py-1 font-semibold text-white"
        style={{
          backgroundColor,
        }}
      >
        {text}
      </span>
      {timeInfo && <span>{timeInfo}</span>}
    </div>
  )
}

export default StatusBadge
