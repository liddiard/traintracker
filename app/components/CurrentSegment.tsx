import { useEffect, useRef } from 'react'
import cn from 'classnames'
import { Stop, TrainMeta } from '@/app/types'
import { formatDuration, getCurrentSegmentProgress } from '../utils'
import Progress from './Progress'
import Link from 'next/link'

interface CurrentSegmentProps {
  trainMeta: TrainMeta
}

function CurrentSegment({ trainMeta }: CurrentSegmentProps) {
  const progressValueRef = useRef<HTMLDivElement>(null)

  const { minsToDeparture, minsToArrival, percent } =
    getCurrentSegmentProgress(trainMeta)
  const { prevStop, curStop, nextStop } = trainMeta
  const agency = trainMeta.id.split('/')[0]
  const atStation = !!minsToDeparture

  // when the stations change, cancel the previous animation so the progress
  // bar doesn't animate slowly back from 100% to 0%
  useEffect(() => {
    if (progressValueRef.current) {
      progressValueRef.current.getAnimations()[0]?.cancel()
    }
  }, [prevStop?.code, nextStop?.code, curStop?.code])

  const renderEndpoint = (station: Stop, className = '') => (
    <Link
      href={`/station/${agency}/${station.code}`}
      className={cn('hover:underline', className)}
    >
      {station.name}
    </Link>
  )

  let segmentStartStation
  let segmentEndStation
  let label
  if (atStation) {
    // train is at a station waiting to depart
    segmentStartStation = curStop
    segmentEndStation = nextStop
    label =
      Math.floor(minsToDeparture) > 0
        ? `Departing in ${formatDuration(minsToDeparture)}`
        : 'Departing now'
  } else if (minsToArrival) {
    // train is enroute between stations
    segmentStartStation = prevStop
    segmentEndStation = nextStop
    label =
      Math.floor(minsToArrival) > 0
        ? `Arriving in ${formatDuration(minsToArrival)}`
        : 'Arriving now'
  } else {
    return null
  }

  if (!segmentStartStation || !segmentEndStation) {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">
        {atStation ? 'Next' : 'Current'} Segment
      </h2>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 leading-tight font-semibold text-balance">
        {renderEndpoint(segmentStartStation)}
        <span>→</span>
        {renderEndpoint(segmentEndStation, 'text-right')}
      </div>

      <Progress
        percent={percent}
        aria-labelledby="segmentProgress"
        progressValueRef={progressValueRef}
      />
      <span
        id="segmentProgress"
        className={cn('block', { 'text-right': !atStation })}
        suppressHydrationWarning
      >
        {label}
      </span>
    </section>
  )
}

export default CurrentSegment
