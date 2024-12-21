import { Fragment } from 'react'
import cn from 'classnames'
import { StationTrain } from '../types'
import { formatTime } from '../utils'

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
  const { code, arr, schArr, name, platform, tz } = station
  const deviation = arr ? arr.valueOf() - schArr.valueOf() : 0

  return (
    <Fragment key={code}>
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
              deviation > 0
                ? 'text-amtrak-yellow-700'
                : 'text-amtrak-green-600',
            )}
          >
            {formatTime(arr!, tz)}
          </span>
        ) : null}
      </div>
      <div className="z-10 bg-white w-3 aspect-square rounded-full my-1 mx-[2px]" />
      <div>
        <span className="font-semibold block leading-snug">{name}</span>
        {platform && <span className="block">Platform {platform}</span>}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
