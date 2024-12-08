'use client'

import { getOffset, getTrainStatus } from '@/app/utils'
import Image from 'next/image'
import { notFound, useParams } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right-gray.svg'
import Pointer from '@/app/img/pointer.svg'
import { headingToRotationMap } from '@/app/constants'
import { useTrains } from '@/app/providers/train'

export default function TrainDetail() {
  const { id } = useParams()
  const { trains } = useTrains()

  const train = trains.find((t) => t.objectID === id)
  if (!train) return notFound()

  const trainStatus = getTrainStatus(train)

  const renderRouteEndpoint = ({
    stationName,
    stationCode,
    tz,
    displayTz,
  }: {
    stationName: string
    stationCode: string
    tz: string
    displayTz: boolean
  }) => (
    <div className="flex flex-col gap-1">
      <div className="text-3xl">{stationCode}</div>
      <div className="font-semibold text-positron-gray-700 leading-tight">
        {stationName}
      </div>
      {displayTz && (
        <div className="text-sm text-positron-gray-700">
          {'UTC' + getOffset(tz) / 60}
        </div>
      )}
    </div>
  )

  const timezonesDiffer = train.originTZ !== train.destTZ
  return (
    <div className="p-3 flex gap-4 flex-col">
      <h1 className="text-2xl font-bold">
        {train.routeName} {train.trainNum}
      </h1>
      <div className="grid gap-2 text-center grid-cols-[1fr_max-content_1fr]">
        {renderRouteEndpoint({
          stationName: train.origName,
          stationCode: train.origCode,
          tz: train.originTZ,
          displayTz: timezonesDiffer,
        })}
        <Image src={CaretRight} alt="to" className="my-3 w-3" />
        {renderRouteEndpoint({
          stationName: train.destName,
          stationCode: train.destCode,
          tz: train.destTZ,
          displayTz: timezonesDiffer,
        })}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge train={train} />
        {trainStatus.curStation ? (
          <span className="text-positron-gray-700">At Station</span>
        ) : (
          <>
            <span>{Math.round(train.velocity)} MPH</span>
            <Image
              src={Pointer}
              alt={train.heading}
              title={train.heading}
              className="w-4"
              style={{
                transform: `rotate(${headingToRotationMap[train.heading]}deg)`,
              }}
            />
          </>
        )}
      </div>
      <h2 className="font-bold text-lg">Current segment</h2>
      <h2 className="font-bold text-lg">Full route</h2>
    </div>
  )
}
