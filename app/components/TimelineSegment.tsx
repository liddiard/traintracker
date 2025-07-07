import { Fragment } from 'react'
import cn from 'classnames'
import { StationTrain } from '../types'
import {
  dayDiffers,
  formatDate,
  formatTime,
  getArrival,
  getDelayColor,
  msToMins,
} from '../utils'

function TimelineSegment({
  stations,
  index,
  height,
}: {
  stations: StationTrain[]
  index: number
  height: number
}) {
  const station = stations[index]
  const prevStation = stations[index - 1]
  const { code, arr, schArr, name, platform, tz } = station
  const deviation = arr ? msToMins(arr.valueOf() - schArr.valueOf()) : 0
  const arrivalTime = getArrival(station)

  const renderDayLine = () => {
    if (
      !prevStation ||
      !dayDiffers(arrivalTime, getArrival(prevStation), tz, prevStation.tz)
    ) {
      return null
    }
    return (
      <div
        className="absolute -z-10 flex w-full -translate-y-[calc(100%+0.5rem)] items-center text-right"
        style={{ gridRowStart: index + 1 }}
      >
        <span className="text-positron-gray-600 absolute right-0 bg-white pl-2 font-semibold">
          {formatDate(arrivalTime, tz)}
        </span>
        <hr className="border-positron-gray-600 w-full border" />
      </div>
    )
  }

  return (
    <Fragment key={code}>
      {renderDayLine()}
      <div className="leading-snug" style={{ height }}>
        <span
          className={cn('block', {
            'line-through': deviation,
            'text-positron-gray-600 dark:text-positron-gray-300': deviation,
          })}
        >
          {formatTime(schArr, tz)}
        </span>
        {deviation !== 0 ? (
          <span
            className={cn(
              'block dark:brightness-150',
              deviation < 0 ? 'text-amtrak-green-500' : '',
            )}
            style={{ color: deviation > 0 ? getDelayColor(deviation) : '' }}
          >
            {formatTime(arr!, tz)}
          </span>
        ) : null}
      </div>
      <div className="z-10 mx-[2px] my-1 aspect-square w-3 rounded-full bg-white" />
      <div className="leading-snug">
        <span className="block font-semibold text-balance">{name}</span>
        {platform && <span className="block">Platform {platform}</span>}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
