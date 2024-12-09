import { TrainStatus } from '@/app/types'
import { formatTime } from '../utils'

interface CurrentSegmentProps {
  trainStatus: TrainStatus
}

const CurrentSegment = ({ trainStatus }: CurrentSegmentProps) => {
  let segmentStartStation
  let segmentEndStation
  let label

  if (
    !trainStatus.prevStation &&
    trainStatus.curStation &&
    trainStatus.nextStation
  ) {
    // train is at station
    segmentStartStation = trainStatus.curStation
    segmentEndStation = trainStatus.nextStation
    label = `Departing in TK at ${formatTime(segmentEndStation.schDep, segmentEndStation.tz)}`
  } else if (
    trainStatus.prevStation &&
    !trainStatus.curStation &&
    trainStatus.nextStation
  ) {
    // train is between stations
    segmentStartStation = trainStatus.prevStation
    segmentEndStation = trainStatus.nextStation
    label = `Arriving in TK at ${formatTime(segmentEndStation.schArr, segmentEndStation.tz)}`
  } else if (
    trainStatus.prevStation &&
    !trainStatus.curStation &&
    !trainStatus.nextStation
  ) {
    // train at the last station
    segmentStartStation = { name: 'TODO: get prev station' }
    segmentEndStation = trainStatus.prevStation
    label = `Arrived TK ago at ${formatTime(segmentEndStation.arr, segmentEndStation.tz)}`
  }

  return (
    <section>
      <h2 className="font-bold text-lg">Current segment</h2>

      <div className="flex justify-between">
        <span>{segmentStartStation?.name}</span>
        <span className="text-right">{segmentEndStation?.name}</span>
      </div>

      <progress id="segmentProgress" value="40" max="100" />
      <label htmlFor="segmentProgress">{label}</label>
    </section>
  )
}

export default CurrentSegment
