import Image from 'next/image'

import { Train } from '../types'
import { getTrainId, getTrainStatus } from '../utils'
import StatusBadge from './StatusBadge'
import CaretRight from '../img/caret-right-gray.svg'

function TrainList({ trains }: { trains: Train[] }) {
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
  })
  return (
    <ul className="flex flex-col gap-5 p-3 my-2">
      {trains
        .toSorted((a, b) => a.updatedAt.valueOf() - b.updatedAt.valueOf())
        .map((train) => (
          <li key={getTrainId(train)} className="flex flex-col gap-2">
            <h2 className="font-bold flex items-start gap-2 leading-tight justify-between">
              <span className="mr-2">
                {train.routeName}{' '}
                <span className="text-amtrak-blue-600">{train.trainNum}</span>
              </span>
              <span className="text-nowrap text-gray-600 flex gap-1 items-center font-semibold">
                {train.origCode}
                <Image src={CaretRight} alt="to" className="inline" />
                {train.destCode}
              </span>
            </h2>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={getTrainStatus(train)} className="text-sm" />
              <span className="font-light">
                {dateFormat.format(train.stations[0].schDep)}
              </span>
            </div>
          </li>
        ))}
    </ul>
  )
}

export default TrainList
