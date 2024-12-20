import { Fragment, useMemo } from 'react'
import { StationTrain, TrainStatus } from '../types'
import {
  formatTime,
  getCurrentSegmentProgress,
  getSegmentDurationStat,
  msToMins,
} from '../utils'
import cn from 'classnames'
import Progress from './Progress'
import TimelineSegment from './TimelineSegment'

const Timeline = ({
  stations,
  trainStatus,
}: {
  stations: StationTrain[]
  trainStatus: TrainStatus
}) => {
  return (
    <>
      <h2 className="font-bold text-lg">Full Route</h2>
      <div className="grid grid-cols-[max-content,min-content,1fr] gap-x-2">
        <div className="bg-red-500 col-start-2 col-span-1 row-start-1 row-span-8" />
        {stations.map((_, idx, stations) => (
          <TimelineSegment
            stations={stations}
            trainStatus={trainStatus}
            index={idx}
            key={idx}
          />
        ))}
      </div>
    </>
  )
}

export default Timeline
