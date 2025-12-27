import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import cn from 'classnames'
import {
  ActiveSubscription,
  Stop,
  NotificationType,
  Train,
  TrainMeta,
} from '../types'
import {
  getCurrentSegmentProgress,
  getScheduledTime,
  getSegmentDurationMinMax,
  msToMins,
} from '../utils'
import Progress from './Progress'
import TimelineSegment from './TimelineSegment'
import { classNames, MIN_PROGRESS_PX } from '../constants'
import { useNotifications } from './hooks'

const MIN_SEGMENT_HEIGHT = 60
const MAX_SEGMENT_HEIGHT = 150

function Timeline({
  stops,
  trainMeta,
  train,
}: {
  stops: Stop[]
  trainMeta: TrainMeta
  train: Train
}) {
  const { prevStop, curStop } = trainMeta
  const [activeSubscriptions, setActiveSubscriptions] = useState<Set<string>>(
    new Set(),
  )
  const { isSupported, getActiveSubscriptions } = useNotifications()

  // get notification subscriptions for the train
  useEffect(() => {
    if (!isSupported) return
    getActiveSubscriptions(train.id).then((subs: ActiveSubscription[]) => {
      const keys = subs.map((s) => `${s.stopCode}-${s.notificationType}`)
      setActiveSubscriptions(new Set(keys))
    })
  }, [train.id, isSupported, getActiveSubscriptions])

  // update subscriptions via API when child components subscribe/unsubscribe
  const handleSubscriptionChange = useCallback(
    (
      stopCode: string,
      notificationType: NotificationType,
      isSubscribed: boolean,
    ) => {
      const subKey = `${stopCode}-${notificationType}`
      setActiveSubscriptions((prev) => {
        const next = new Set(prev)
        if (isSubscribed) {
          next.add(subKey)
        } else {
          next.delete(subKey)
        }
        return next
      })
    },
    [],
  )

  // get the longest and shortest segments of this train route, to be used in timeline
  // segment height calculation
  const segmentDurations = useMemo(
    () => ({
      max: getSegmentDurationMinMax(stops, Math.max),
      min: getSegmentDurationMinMax(stops, Math.min, Infinity),
    }),
    [stops],
  )

  /**
   * Calculates the display height of a timeline segment between two stops.
   * The height is scaled proportionally based on the travel duration so longer segment
   * durations are taller. Height is calculated relative to the min and max segment
   * durations for the entire trip.
   */
  const getSegmentHeight = useCallback(
    (stop: Stop, nextStop: Stop) => {
      // For the last stop, there is no next segment, so return a default height
      if (!nextStop) {
        return MIN_SEGMENT_HEIGHT
      }

      // For single-segment trips (two stops), display the single segment as max height
      if (stops.length === 2) {
        return MAX_SEGMENT_HEIGHT
      }

      const curStationArr = getScheduledTime(stop.arrival)
      const nextStationArr = getScheduledTime(nextStop.arrival)
      const segmentDuration =
        curStationArr && nextStationArr
          ? msToMins(nextStationArr.valueOf() - curStationArr.valueOf())
          : MIN_SEGMENT_HEIGHT + MAX_SEGMENT_HEIGHT / 2

      // Scale the duration to a value between 0 and 1 relative to the min/max duration
      // for all segments
      const distanceFromMin = segmentDuration - segmentDurations.min
      const totalDistance = segmentDurations.max - segmentDurations.min

      // If all segments are of equal duration, totalDistance will be 0.
      // To avoid division by zero, set percentFromMin to 0 (minimum segment height).
      const percentFromMin =
        totalDistance > 0 ? distanceFromMin / totalDistance : 0

      // Convert the scaled value to a pixel height between the defined min and max
      // heights
      return Math.round(
        (MAX_SEGMENT_HEIGHT - MIN_SEGMENT_HEIGHT) * percentFromMin +
          MIN_SEGMENT_HEIGHT,
      )
    },
    [segmentDurations, stops],
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
          className="absolute top-0.5 col-start-2 h-[calc(100%+1rem)] w-4"
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
            trainId={train.id}
            activeSubscriptions={activeSubscriptions}
            onSubscriptionChange={handleSubscriptionChange}
            key={idx}
          />
        ))}
      </div>
    </>
  )
}

export default Timeline
