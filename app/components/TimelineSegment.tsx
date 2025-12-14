import { Fragment } from 'react'
import cn from 'classnames'
import { Stop } from '../types'
import { classNames } from '../constants'
import {
  dayDiffers,
  formatDate,
  formatTime,
  getDelayColor,
  getScheduledTime,
} from '../utils'

function TimelineSegment({
  stops,
  index,
  height,
}: {
  stops: Stop[]
  index: number
  height: number
}) {
  const stop = stops[index]
  const prevStop = stops[index - 1]
  const { code, name, arrival } = stop
  const { delay } = arrival

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
          {formatDate(arrival.time, stop.timezone)}
        </span>
        <hr className={cn('w-full border', classNames.sectionSeparator)} />
      </div>
    )
  }

  return (
    <Fragment key={code}>
      {renderDayLine()}
      <div className="leading-snug" style={{ height }}>
        <span
          className={cn('block', {
            'line-through': delay,
            [classNames.textDeemphasized]: delay,
          })}
        >
          {formatTime(getScheduledTime(arrival)!, stop.timezone)}
        </span>
        {delay !== 0 ? (
          <span
            className={cn(
              'block dark:brightness-150',
              delay < 0 ? 'text-amtrak-green-500' : '',
            )}
            style={{ color: delay > 0 ? getDelayColor(delay) : '' }}
          >
            {formatTime(arrival.time, stop.timezone)}
          </span>
        ) : null}
      </div>
      <div className="z-10 mx-[2px] my-1 aspect-square w-3 rounded-full bg-white" />
      <div className="leading-snug">
        <span className="block font-semibold text-balance">{name}</span>
        {/* {platform && <span className="block">Platform {platform}</span>} */}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
