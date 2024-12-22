import { TrainStatus } from '@/app/types'
import cn from 'classnames'
import { formatDuration, getCurrentSegmentProgress } from '../utils'
import Progress from './Progress'
import { useEffect, useRef } from 'react'

interface CurrentSegmentProps {
  trainStatus: TrainStatus
}

function CurrentSegment({ trainStatus }: CurrentSegmentProps) {
  const progressValueRef = useRef<HTMLDivElement>(null)

  const { minsToDeparture, minsToArrival, percent } =
    getCurrentSegmentProgress(trainStatus)
  const { prevStation, curStation, nextStation } = trainStatus
  const atStation = !!minsToDeparture

  // when the stations change, cancel the previous animation so the progress
  // bar doesn't animate slowly back from 100% to 0%
  useEffect(() => {
    if (progressValueRef.current) {
      progressValueRef.current.getAnimations()[0].cancel()
    }
  }, [prevStation?.code, nextStation?.code, curStation?.code])

  let segmentStartStation
  let segmentEndStation
  let label
  if (atStation) {
    // train is at a station waiting to depart
    segmentStartStation = curStation
    segmentEndStation = nextStation
    label = `Departing in ${formatDuration(minsToDeparture)}`
  } else if (minsToArrival) {
    // train is enroute between stations
    segmentStartStation = prevStation
    segmentEndStation = nextStation
    label =
      Math.floor(minsToArrival) > 0
        ? `Arriving in ${formatDuration(minsToArrival)}`
        : 'Arriving now'
  } else {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">
        {atStation ? 'Next' : 'Current'} Segment
      </h2>

      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 text-balance font-semibold leading-tight">
        <span>{segmentStartStation?.name}</span>
        <span>→</span>
        <span className="text-right">{segmentEndStation?.name}</span>
      </div>

      <Progress
        percent={percent}
        id="segmentProgress"
        progressValueRef={progressValueRef}
      />
      <label
        htmlFor="segmentProgress"
        className={cn('block', { 'text-right': !atStation })}
      >
        {label}
      </label>
    </section>
  )
}

export default CurrentSegment
