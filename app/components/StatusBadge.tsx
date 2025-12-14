import cn from 'classnames'

import { TimeStatus, Train } from '@/app/types'
import {
  formatDuration,
  formatTime,
  getTrainColor,
  getTrainMeta,
} from '@/app/utils'

function StatusBadge({
  train,
  className,
}: {
  train: Train
  className?: string
}) {
  const trainMeta = getTrainMeta(train)
  const backgroundColor = getTrainColor(trainMeta)
  const { code, delay, firstStop, lastStop } = trainMeta

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
    if (
      code === TimeStatus.PREDEPARTURE &&
      firstStop.departure.time &&
      firstStop.timezone
    ) {
      return formatTime(firstStop.departure.time, firstStop.timezone)
    } else if (code === TimeStatus.DELAYED) {
      return formatDuration(delay, { shortenMins: true })
    } else if (code === TimeStatus.COMPLETE) {
      return formatTime(lastStop.arrival.time, lastStop.timezone)
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
