import { TrainStatus } from '@/app/types'
import cn from 'classnames'

interface CurrentSegmentProps {
  trainStatus: TrainStatus
}

const formatMinutes = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`

const CurrentSegment = ({ trainStatus }: CurrentSegmentProps) => {
  let segmentStartStation
  let segmentEndStation
  let label
  let totalMinsBetweenStations = 100
  let minsElapsed = 0
  let isDeparting = false

  if (trainStatus.curStation) {
    // train is at station
    segmentStartStation = trainStatus.curStation
    segmentEndStation = trainStatus.nextStation
    const minsToDeparture = Math.round(
      (segmentEndStation.schDep.valueOf() - Date.now().valueOf()) / 1000 / 60,
    )
    label = `Departing in ${formatMinutes(minsToDeparture)}`
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
    label = `arriving in ${formatMinutes(minsToArrival)}`
  } else {
    // train hasn't departed or is at the last station
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold text-lg">Current segment</h2>

      <div className="flex justify-between gap-2 leading-snug">
        <span>{segmentStartStation?.name}</span>
        <span>→</span>
        <span className="text-right">{segmentEndStation?.name}</span>
      </div>

      <div className="relative h-4">
        <progress
          id="segmentProgress"
          value={minsElapsed}
          max={totalMinsBetweenStations}
          className="relative w-full progress-unfilled:rounded-full progress-unfilled:appearance-none h-4 progress-unfilled:bg-positron-gray-200 progress-filled:bg-amtrak-blue-500 progress-filled:rounded-full before-after:content-[''] before-after:block before-after:absolute before-after:bg-white before-after:w-4 before-after:aspect-square before-after:rounded-full before-after:top-0 before-after:border-2 before:left-0 before:border-amtrak-blue-500 after:right-0 after:border-positron-gray-200"
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
