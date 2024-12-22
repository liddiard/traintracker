import { Fragment, useCallback, useMemo } from 'react'
import { StationTrain, TrainStatus } from '../types'
import {
  getCurrentSegmentProgress,
  getSegmentDurationMinMax,
  msToMins,
} from '../utils'
import Progress from './Progress'
import TimelineSegment from './TimelineSegment'
import { MIN_PROGRESS_PX } from '../constants'

const MIN_SEGMENT_HEIGHT = 50
const MAX_SEGMENT_HEIGHT = 150

function Timeline({
  stations,
  trainStatus,
}: {
  stations: StationTrain[]
  trainStatus: TrainStatus
}) {
  const { prevStation, curStation } = trainStatus

  const segmentDurations = useMemo(
    () => ({
      max: getSegmentDurationMinMax(stations, Math.max),
      min: getSegmentDurationMinMax(stations, Math.min, Infinity),
    }),
    [stations],
  )

  const getSegmentHeight = useCallback(
    (station: StationTrain, nextStation: StationTrain) => {
      if (!nextStation) {
        return MIN_SEGMENT_HEIGHT
      }
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
    },
    [segmentDurations],
  )

  const segmentHeights = useMemo(
    () =>
      stations.map((_, idx) =>
        getSegmentHeight(stations[idx], stations[idx + 1]),
      ),
    [stations, getSegmentHeight],
  )

  const prevStationIndex = stations.findIndex(
    ({ code }) => code === (curStation?.code || prevStation?.code),
  )
  const completedSegmentsHeight = segmentHeights
    .slice(0, prevStationIndex)
    .reduce((acc, cur) => cur + acc, 0)
  const totalHeight =
    prevStationIndex === -1 // train isn't underway yet
      ? 0
      : completedSegmentsHeight +
        segmentHeights[prevStationIndex] *
          getCurrentSegmentProgress(trainStatus).percent

  return (
    <>
      <h2 className="font-bold text-lg border-t border-positron-gray-200 pt-4">
        Full Route
      </h2>
      <div className="relative grid grid-cols-[max-content,min-content,1fr] gap-x-2">
        <div
          className="absolute top-[2px] h-[calc(100%+1rem)] col-start-2 w-4"
          style={{
            gridRowEnd: stations.length,
          }}
        >
          <Progress
            px={totalHeight + MIN_PROGRESS_PX}
            vertical
            showEndpoints={false}
          />
        </div>
        {stations.map((_, idx, stations) => (
          <TimelineSegment
            stations={stations}
            index={idx}
            height={segmentHeights[idx]}
            key={idx}
          />
        ))}
      </div>
    </>
  )
}

export default Timeline
