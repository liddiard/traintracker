import { Fragment, useEffect, useState } from 'react'
import cn from 'classnames'
import { Stop, NotificationType } from '../types'
import { classNames } from '../constants'
import {
  dayDiffers,
  formatDate,
  formatTime,
  getDelayColor,
  getScheduledTime,
} from '../utils'
import { useSettings } from '../providers/settings'
import NotificationButton from './NotificationButton'
import Link from 'next/link'

function TimelineSegment({
  stops,
  index,
  height,
  trainId,
  activeSubscriptions,
  onSubscriptionChange,
}: {
  stops: Stop[]
  index: number
  height: number
  trainId: string
  activeSubscriptions: Set<string>
  onSubscriptionChange: (
    stopCode: string,
    notificationType: NotificationType,
    isSubscribed: boolean,
  ) => void
}) {
  const { settings } = useSettings()
  const { timeFormat, timeZone } = settings
  const stop = stops[index]
  const prevStop = stops[index - 1]
  const { code, name, arrival } = stop
  const { delay } = arrival
  const formatTimeOptions = {
    tz: timeZone === 'local' ? stop.timezone : undefined,
    timeFormat,
  }
  // Extract agency from trainId (format: "agency/id")
  const agency = trainId.split('/')[0]
  const stationId = `${agency}/${code}`

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const renderDayLine = () => {
    if (
      !prevStop ||
      !dayDiffers(
        arrival.time,
        prevStop.arrival.time,
        stop.timezone,
        prevStop.timezone,
      )
    ) {
      return null
    }
    return (
      <div
        className="absolute -z-10 flex w-full -translate-y-[calc(100%+0.5rem)] items-center text-right"
        style={{ gridRowStart: index + 1 }}
      >
        <span
          className={cn(
            'absolute right-0 bg-white pl-2 font-semibold',
            classNames.textDeemphasized,
          )}
        >
          {formatDate(
            arrival.time,
            timeZone === 'local' ? stop.timezone : undefined,
          )}
        </span>
        <hr className={cn('w-full border', classNames.sectionSeparator)} />
      </div>
    )
  }

  return (
    <Fragment key={stationId}>
      {renderDayLine()}
      <div className="leading-snug" style={{ height }}>
        <time
          className={cn('block', {
            'line-through': delay,
            [classNames.textDeemphasized]: delay,
          })}
          suppressHydrationWarning
        >
          {formatTime(getScheduledTime(arrival)!, formatTimeOptions)}
        </time>
        {/* getDelayColor requires CSS variables only available after client-side mount */}
        {delay !== 0 && mounted ? (
          <time
            className={cn(
              'block dark:brightness-150',
              delay < 0 ? 'text-amtrak-green-500' : '',
            )}
            style={{ color: delay > 0 ? getDelayColor(delay) : '' }}
            suppressHydrationWarning
          >
            {formatTime(arrival.time, formatTimeOptions)}
          </time>
        ) : null}
      </div>
      <div className="z-10 mx-0.5 my-1 aspect-square w-3 rounded-full bg-white" />
      <div className="flex items-start gap-1 leading-snug">
        <Link
          href={`/station/${stationId}`}
          className="block font-semibold text-balance hover:underline"
        >
          {name}
        </Link>
        <NotificationButton
          trainId={trainId}
          stopCode={code}
          stopName={name}
          hasDeparted={stop.departure.time < new Date()}
          activeSubscriptions={activeSubscriptions}
          onSubscriptionChange={onSubscriptionChange}
        />
        {/* {platform && <span className="block">Platform {platform}</span>} */}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
