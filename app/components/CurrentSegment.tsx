import { TrainStatus } from '@/app/types'
import cn from 'classnames'
import { getCurrentSegmentProgress } from '../utils'
import Progress from './Progress'

interface CurrentSegmentProps {
  trainStatus: TrainStatus
}

const formatMinutes = (minutes: number) => {
  minutes = Math.round(minutes)
  return minutes < 60
    ? `${minutes} minutes`
    : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

const CurrentSegment = ({ trainStatus }: CurrentSegmentProps) => {
  const { minsToDeparture, minsToArrival, percent } =
    getCurrentSegmentProgress(trainStatus)
  const { prevStation, curStation, nextStation } = trainStatus
  const isDeparting = !!minsToDeparture

  let segmentStartStation
  let segmentEndStation
  let label

  if (minsToDeparture) {
    // train is at a station waiting to depart
    segmentStartStation = curStation
    segmentEndStation = nextStation
    label = `Departing in ${formatMinutes(minsToDeparture)}`
  } else if (minsToArrival) {
    // train is enroute between stations
    segmentStartStation = prevStation
    segmentEndStation = nextStation
    label = minsToArrival ? `Arriving in ${formatMinutes(minsToArrival)}` : ''
  } else {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold text-lg">Current segment</h2>

      <div className="flex justify-between items-center gap-2 leading-snug">
        <span>{segmentStartStation?.name}</span>
        <span>→</span>
        <span className="text-right">{segmentEndStation?.name}</span>
      </div>

      <div className="relative h-4">
        <Progress percent={percent} id="segmentProgress" />
      </div>
      <label
        htmlFor="segmentProgress"
        className={cn('block', { 'text-right': !isDeparting })}
      >
        {label}
      </label>
    </section>
  )
}

export default CurrentSegment
