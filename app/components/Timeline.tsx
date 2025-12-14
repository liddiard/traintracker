import { Fragment, useCallback, useMemo } from 'react'
import cn from 'classnames'
import { Stop, TrainMeta } from '../types'
import {
  getCurrentSegmentProgress,
  getScheduledTime,
  getSegmentDurationMinMax,
  msToMins,
} from '../utils'
import Progress from './Progress'
import TimelineSegment from './TimelineSegment'
import { classNames, MIN_PROGRESS_PX } from '../constants'

const MIN_SEGMENT_HEIGHT = 50
const MAX_SEGMENT_HEIGHT = 150

function Timeline({
  stops,
  trainMeta,
}: {
  stops: Stop[]
  trainMeta: TrainMeta
}) {
  const { prevStop, curStop } = trainMeta

  const segmentDurations = useMemo(
    () => ({
      max: getSegmentDurationMinMax(stops, Math.max),
      min: getSegmentDurationMinMax(stops, Math.min, Infinity),
    }),
    [stops],
  )

  const getSegmentHeight = useCallback(
    (stop: Stop, nextStop: Stop) => {
      if (!nextStop) {
        return MIN_SEGMENT_HEIGHT
      }
      const curStationArr = getScheduledTime(stop.arrival)
      const nextStationArr = getScheduledTime(nextStop.arrival)
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
    () => stops.map((_, idx) => getSegmentHeight(stops[idx], stops[idx + 1])),
    [stops, getSegmentHeight],
  )

  const prevStationIndex = stops.findIndex(
    ({ code }) => code === (curStop?.code || prevStop?.code),
  )
  const completedSegmentsHeight = segmentHeights
    .slice(0, prevStationIndex)
    .reduce((acc, cur) => cur + acc, 0)
  const totalHeight =
    prevStationIndex === -1 // train isn't underway yet
      ? 0
      : completedSegmentsHeight +
        segmentHeights[prevStationIndex] *
          getCurrentSegmentProgress(trainMeta).percent

  return (
    <>
      <h2
        className={cn(
          'border-t pt-4 text-lg font-bold',
          classNames.sectionSeparator,
        )}
      >
        Full Route
      </h2>
      <div className="relative grid grid-cols-[max-content_min-content_1fr] gap-x-2">
        <div
          className="absolute top-[2px] col-start-2 h-[calc(100%+1rem)] w-4"
          style={{
            gridRowEnd: stops.length,
          }}
        >
          <Progress
            px={totalHeight + MIN_PROGRESS_PX}
            vertical
            showEndpoints={false}
          />
        </div>
        {stops.map((_, idx, stops) => (
          <TimelineSegment
            stops={stops}
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
