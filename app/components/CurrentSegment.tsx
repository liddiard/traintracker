import { TrainStatus } from '@/app/types'
import { formatTime } from '../utils'
import cn from 'classnames'

interface CurrentSegmentProps {
  trainStatus: TrainStatus
}

const formatMinutes = (minutes: number) =>
  minutes < 60
    ? `${minutes} min.`
    : `${Math.floor(minutes / 60)} hr. ${minutes % 60} min.`

const CurrentSegment = ({ trainStatus }: CurrentSegmentProps) => {
  let segmentStartStation
  let segmentEndStation
  let label
  let totalMinsBetweenStations = 100
  let minsElapsed = 0
  let isDeparting = false

  if (
    !trainStatus.prevStation &&
    trainStatus.curStation &&
    trainStatus.nextStation
  ) {
    // train is at station
    segmentStartStation = trainStatus.curStation
    segmentEndStation = trainStatus.nextStation
    const minsToDeparture = Math.round(
      (segmentEndStation.schDep.valueOf() - Date.now().valueOf()) / 1000 / 60,
    )
    label = `Departing in ${formatMinutes(minsToDeparture)} at ${formatTime(segmentEndStation.schDep, segmentEndStation.tz)}`
    isDeparting = true
  } else if (
    trainStatus.prevStation &&
    !trainStatus.curStation &&
    trainStatus.nextStation
  ) {
    // train is between stations
    segmentStartStation = trainStatus.prevStation
    segmentEndStation = trainStatus.nextStation
    const minsToArrival = Math.round(
      (segmentEndStation.schArr.valueOf() - Date.now().valueOf()) / 1000 / 60,
    )
    totalMinsBetweenStations = Math.round(
      (segmentEndStation.schArr.valueOf() -
        segmentStartStation.schDep.valueOf()) /
        1000 /
        60,
    )
    minsElapsed = totalMinsBetweenStations - minsToArrival
    label = `Arriving in ${formatMinutes(minsToArrival)} at ${formatTime(segmentEndStation.schArr, segmentEndStation.tz)}`
  } else if (
    trainStatus.prevStation &&
    !trainStatus.curStation &&
    !trainStatus.nextStation
  ) {
    // train at the last station
    segmentStartStation = { name: 'TODO: get prev station' }
    segmentEndStation = trainStatus.prevStation
    const minsSinceArrival = Math.round(
      (Date.now().valueOf() - segmentEndStation.arr.valueOf()) / 1000 / 60,
    )
    minsElapsed = totalMinsBetweenStations
    label = `Arrived ${formatMinutes(minsSinceArrival)} ago at ${formatTime(segmentEndStation.arr, segmentEndStation.tz)}`
  }

  return (
    <section>
      <h2 className="font-bold text-lg">Current segment</h2>

      <div className="flex justify-between">
        <span>{segmentStartStation?.name}</span>
        <span className="text-right">{segmentEndStation?.name}</span>
      </div>

      <div className="segmentProgressWrapper">
        <progress
          id="segmentProgress"
          value={minsElapsed}
          max={totalMinsBetweenStations}
        />
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
