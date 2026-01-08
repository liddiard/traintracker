import cn from 'classnames'

import { TimeStatus, Train } from '@/app/types'
import {
  formatDuration,
  formatTime,
  getTrainColor,
  getTrainMeta,
} from '@/app/utils'
import { useSettings } from '../providers/settings'
import { useEffect, useState } from 'react'

function StatusBadge({
  train,
  className,
}: {
  train: Train
  className?: string
}) {
  const trainMeta = getTrainMeta(train)
  const { settings } = useSettings()
  const { timeFormat, timeZone } = settings
  const backgroundColor = getTrainColor(trainMeta)
  const { code, delay, firstStop, lastStop } = trainMeta

  const [mounted, setMounted] = useState(false)

  // set mounted state on client side to force train labels to get correct colors from
  // CSS variables
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

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
      return formatTime(firstStop.departure.time, {
        tz: timeZone === 'local' ? firstStop.timezone : undefined,
        timeFormat,
      })
    } else if (code === TimeStatus.DELAYED) {
      return formatDuration(delay, { shortenMins: true })
    } else if (code === TimeStatus.COMPLETE) {
      return formatTime(lastStop.arrival.time, {
        tz: timeZone === 'local' ? lastStop.timezone : undefined,
        timeFormat,
      })
    }
  }

  if (!mounted) {
    return null
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
      {timeInfo && <time>{timeInfo}</time>}
    </div>
  )
}

export default StatusBadge
