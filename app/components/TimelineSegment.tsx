import { Fragment, useMemo } from 'react'
import cn from 'classnames'
import { StationTrain, TrainStatus } from '../types'
import {
  getSegmentDurationStat,
  msToMins,
  getCurrentSegmentProgress,
  formatTime,
} from '../utils'
import Progress from './Progress'

const MIN_SEGMENT_HEIGHT = 40
const MAX_SEGMENT_HEIGHT = 120

const TimelineSegment = ({
  stations,
  index,
  trainStatus,
}: {
  stations: StationTrain[]
  index: number
  trainStatus: TrainStatus
}) => {
  const segmentDurations = useMemo(
    () => ({
      max: getSegmentDurationStat(stations, Math.max),
      min: getSegmentDurationStat(stations, Math.min, Infinity),
    }),
    [stations],
  )

  const prevStationIndex = stations.findIndex(
    ({ code }) => code === trainStatus.prevStation?.code,
  )

  const getSegmentHeight = (
    station: StationTrain,
    nextStation: StationTrain,
  ) => {
    const curStationArr = station.schArr
    const nextStationArr = nextStation.schArr
    const segmentDuration =
      curStationArr && nextStationArr
        ? msToMins(nextStationArr.valueOf() - curStationArr.valueOf())
        : MIN_SEGMENT_HEIGHT + MAX_SEGMENT_HEIGHT / 2
    const distanceFromMin = segmentDuration - segmentDurations.min
    const totalDistance = segmentDurations.max - segmentDurations.min
    const percentFromMin = distanceFromMin / totalDistance
    return Math.round(
      (MAX_SEGMENT_HEIGHT - MIN_SEGMENT_HEIGHT) * percentFromMin +
        MIN_SEGMENT_HEIGHT,
    )
  }

  const station = stations[index]
  const { code, arr, schArr, name, platform, tz } = station
  const nextStation = stations[index + 1]
  // const nextStationArrival =
  //   nextStation?.arr?.valueOf() ?? nextStation?.schArr.valueOf()
  // const arrival = arr?.valueOf() ?? schArr.valueOf()
  const deviation = arr ? arr.valueOf() - schArr.valueOf() : 0
  let segmentProgress
  if (index < prevStationIndex) {
    // segment is in the past
    segmentProgress = 1
  } else if (index > prevStationIndex) {
    // segment is in the future
    segmentProgress = 0
  } else {
    // segment is the current one
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
      {nextStation ? (
        <div
          style={{
            minHeight: `${getSegmentHeight(station, nextStation)}px`,
          }}
        >
          <Progress
            percent={segmentProgress}
            vertical
            classNames={{
              outer: 'rounded-none h-[calc(100%+17px)]',
              inner: 'rounded-none',
            }}
          />
        </div>
      ) : (
        <span></span>
      )}
      <div>
        <span className="font-semibold block leading-snug">{name}</span>
        {platform && <span className="block">Platform {platform}</span>}
      </div>
    </Fragment>
  )
}

export default TimelineSegment
