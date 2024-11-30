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
    <ul className="p-3">
      {trains
        .toSorted((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf())
        .map((train) => (
          <li key={getTrainId(train)} className="my-4 flex flex-col gap-2">
            <h2 className="font-bold flex gap-2 leading-tight justify-between">
              <span className="mr-2">
                {train.routeName}{' '}
                <span className="text-amtrak-blue-600">{train.trainNum}</span>
              </span>
              <span className="text-nowrap font-normal text-gray-600 flex gap-1 items-center">
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
