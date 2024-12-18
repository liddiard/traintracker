import { Fragment } from 'react'
import { StationTrain, Train, TrainStatus } from '../types'
import { formatTime, getCurrentSegmentProgress } from '../utils'
import cn from 'classnames'

const Timeline = ({
  train,
  trainStatus,
}: {
  train: Train
  trainStatus: TrainStatus
}) => {
  const renderSegment = (station: StationTrain) => {
    const { code, arr, schArr, name, platform, tz } = station
    const { prevStation, curStation, nextStation } = trainStatus
    const nextStationArrival =
      nextStation?.arr?.valueOf() ?? nextStation?.schArr.valueOf()
    const arrival = arr?.valueOf() ?? schArr.valueOf()
    const deviation = arr ? arr.valueOf() - schArr.valueOf() : 0
    let segmentProgress
    if (nextStationArrival && nextStationArrival > arrival) {
      // segment is in the past
      segmentProgress = 1
    } else if (nextStationArrival && nextStationArrival < arrival) {
      // segment is in the future
      segmentProgress = 0
    } else {
      segmentProgress = getCurrentSegmentProgress(trainStatus).percent
    }
    return (
      <Fragment key={code}>
        <div>
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
        <div>
          <progress
            value={segmentProgress}
            max={1}
            className="rotate-90 translate-y-full relative progress-unfilled:rounded-full progress-unfilled:appearance-none w-12 progress-unfilled:bg-positron-gray-200 progress-filled:bg-amtrak-blue-500 progress-filled:rounded-full progress-filled:transition-all before-after:content-[''] before-after:block before-after:absolute before-after:bg-white before-after:w-4 before-after:aspect-square before-after:rounded-full before-after:top-0 before-after:border-2 before:left-0 before:border-amtrak-blue-500 after:right-0 after:border-positron-gray-200"
          />
        </div>
        <div>
          <span className="font-bold block">{name}</span>
          {platform && <span className="block">Platform {platform}</span>}
        </div>
      </Fragment>
    )
  }

  return (
    <>
      <h2 className="font-bold text-lg">Full route</h2>
      <div className="grid grid-cols-[max-content,min-content,1fr] gap-2">
        {train.stations.map(renderSegment)}
      </div>
    </>
  )
}

export default Timeline
