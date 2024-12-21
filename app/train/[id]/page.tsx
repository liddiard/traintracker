'use client'

import { formatTime, getOffset, getTrainStatus } from '@/app/utils'
import Image from 'next/image'
import { notFound, useParams } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right-gray.svg'
import Pie from '@/app/img/pie.svg'
import Pointer from '@/app/img/pointer.svg'
import { headingToRotationMap } from '@/app/constants'
import { useTrains } from '@/app/providers/train'
import CurrentSegment from '@/app/components/CurrentSegment'
import { TrainStatus } from '@/app/types'
import Timeline from '@/app/components/Timeline'
import Link from 'next/link'

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
      <div className="font-semibold text-positron-gray-600 leading-tight">
        {stationName}
      </div>
      {displayTz && (
        <div className="text-sm text-positron-gray-600">
          {'UTC' + getOffset(tz) / 60}
        </div>
      )}
    </div>
  )

  const renderTrainVelocity = (velocity: number, trainStatus: TrainStatus) => {
    if (trainStatus.curStation) {
      return <span className="text-positron-gray-600">At Station</span>
    }
    if (velocity) {
      return (
        <>
          <span>{Math.round(velocity)} mph</span>
          <span className="flex gap-1 items-baseline">
            <Image
              src={Pointer}
              alt={train.heading}
              title={train.heading}
              className="w-4 transition-all duration-1000"
              style={{
                transform: `rotate(${headingToRotationMap[train.heading]}deg)`,
              }}
            />
            <span>{train.heading}</span>
          </span>
        </>
      )
    }
    return null
  }

  const timezonesDiffer = train.originTZ !== train.destTZ
  return (
    <div className="p-3 flex gap-5 flex-col mb-4">
      <Link
        href="/"
        className="text-amtrak-blue-600 font-semibold hover:text-amtrak-blue-500"
      >
        ← All Trains
      </Link>
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
        {renderTrainVelocity(train.velocity, trainStatus)}
      </div>

      <CurrentSegment trainStatus={trainStatus} />

      <div className="flex justify-between text-positron-gray-600 text-sm">
        <span>Last update {formatTime(train.updatedAt)}</span>
        <span className="flex items-center gap-2">
          Next check
          <Image
            src={Pie}
            alt=""
            className="rounded-full w-4 aspect-square border border-positron-gray-600 shrink-0"
          />
        </span>
      </div>

      <Timeline stations={train.stations} trainStatus={trainStatus} />
    </div>
  )
}
