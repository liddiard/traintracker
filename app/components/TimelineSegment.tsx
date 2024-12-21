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

const TimelineSegment = ({
  stations,
  index,
  height,
}: {
  stations: StationTrain[]
  index: number
  height: number
}) => {
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
        className="absolute flex items-center w-full text-right -translate-y-[calc(100%+0.5rem)] -z-10"
        style={{ gridRowStart: index + 1 }}
      >
        <span className="absolute right-0 bg-white pl-2 text-positron-gray-600 font-semibold">
          {formatDate(arrivalTime, tz)}
        </span>
        <hr className="w-full border border-positron-gray-600" />
      </div>
    )
  }

  return (
    <Fragment key={code}>
      {renderDayLine()}
      <div style={{ height }}>
        <span
          className={cn('block', {
            'line-through': deviation,
            'text-positron-gray-600': deviation,
          })}
        >
          {formatTime(schArr, tz)}
        </span>
        {deviation !== 0 ? (
          <span
            className={cn(
              'block',
              deviation < 0 ? 'text-amtrak-green-600' : '',
            )}
            style={{ color: deviation > 0 ? getDelayColor(deviation) : '' }}
          >
            {formatTime(arr!, tz)}
          </span>
        ) : null}
      </div>
      <div className="z-10 bg-white w-3 aspect-square rounded-full my-1 mx-[2px]" />
      <div>
        <span className="font-semibold block leading-snug text-balance">
          {name}
        </span>
        {platform && <span className="block">Platform {platform}</span>}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
