'use client'

import {
  formatDate,
  formatDuration,
  formatTime,
  getOffset,
  getTrainParams,
  getTrainStatus,
  msToMins,
} from '@/app/utils'
import Image from 'next/image'
import cn from 'classnames'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right-gray.svg'
import Pie from '@/app/img/pie.svg'
import Warning from '@/app/img/warning.svg'
import Pointer from '@/app/img/pointer.svg'
import { headingToRotationMap } from '@/app/constants'
import { useTrains } from '@/app/providers/train'
import CurrentSegment from '@/app/components/CurrentSegment'
import { TimeStatus, TrainStatus } from '@/app/types'
import Timeline from '@/app/components/Timeline'
import Link from 'next/link'

export default function TrainDetail() {
  const { id } = useParams()
  const trainSearchParams = getTrainParams(useSearchParams())
  const { trains } = useTrains()
  const train = trains.find((t) => t.objectID === id)

  if (!train) return notFound()

  const trainStatus = getTrainStatus(train)

  const renderRouteEndpoint = ({
    stationName,
    stationCode,
    date,
    tz,
    displayTz,
  }: {
    stationName: string
    stationCode: string
    date: Date
    tz: string
    displayTz: boolean
  }) => (
    <>
      <div className="text-3xl">{stationCode}</div>
      <div className="mb-2 font-semibold leading-tight text-positron-gray-600">
        {stationName}
      </div>
      <div>
        {formatDate(date, tz)}, {formatTime(date, tz)}
      </div>
      {displayTz ? (
        <div className="text-sm text-positron-gray-600">
          UTC<span className="font-semibold">{getOffset(tz) / 60}</span>
        </div>
      ) : (
        <div />
      )}
    </>
  )

  const renderTrainVelocity = (velocity: number, trainStatus: TrainStatus) => {
    if (trainStatus.curStation) {
      return <span>At Station</span>
    }
    if (velocity) {
      return (
        <>
          <span>{Math.round(velocity)} mph</span>
          <span className="flex items-baseline gap-1">
            <Image
              src={Pointer}
              alt={train.heading}
              title={train.heading}
              className="w-4 self-center transition-all duration-1000"
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
  const hasTrainSearchParams = !!Object.entries(trainSearchParams).length
  // last update is more than 10 minutes old
  const minsSinceLastUpdate = msToMins(Date.now() - train.updatedAt.valueOf())
  const isStaleData =
    ![TimeStatus.PREDEPARTURE, TimeStatus.COMPLETE].includes(
      trainStatus.code!,
    ) && minsSinceLastUpdate > 10
  return (
    <div className="mb-4 flex flex-col gap-5 p-3">
      <Link
        href={`/?${new URLSearchParams(trainSearchParams).toString()}`}
        className="font-semibold text-amtrak-blue-600 hover:text-amtrak-blue-500"
      >
        {hasTrainSearchParams ? '← Back to Search' : '← All Trains'}
      </Link>
      <h1 className="text-3xl font-bold">
        {train.routeName}{' '}
        <span className="text-amtrak-blue-600">{train.trainNum}</span>
      </h1>
      <div className="grid grid-flow-col grid-cols-[1fr,auto,1fr] grid-rows-[repeat(4,auto)] border-y border-positron-gray-200 py-4 text-center leading-relaxed">
        {renderRouteEndpoint({
          stationName: train.origName,
          stationCode: train.origCode,
          date: trainStatus.firstStation.schArr,
          tz: train.originTZ,
          displayTz: timezonesDiffer,
        })}
        <Image src={CaretRight} alt="to" className="w-3 self-center" />
        <span />
        <span />
        <span />
        {renderRouteEndpoint({
          stationName: train.destName,
          stationCode: train.destCode,
          date: trainStatus.lastStation.schArr,
          tz: train.destTZ,
          displayTz: timezonesDiffer,
        })}
      </div>
      <div className="flex items-baseline gap-3">
        <StatusBadge train={train} />
        {renderTrainVelocity(train.velocity, trainStatus)}
      </div>

      <CurrentSegment trainStatus={trainStatus} />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-positron-gray-600">
          <span>
            Last update{' '}
            <span className={cn({ 'text-amtrak-yellow-700': isStaleData })}>
              {formatTime(train.updatedAt)}
            </span>
            {isStaleData && (
              <Image
                src={Warning}
                alt="caution"
                className="mx-1 inline w-4 align-text-top"
              />
            )}
          </span>
          <span className="flex items-center gap-2">
            Next check
            <Image
              src={Pie}
              alt=""
              className="aspect-square w-4 shrink-0 rounded-full border border-positron-gray-600"
            />
          </span>
        </div>
        {isStaleData && (
          <span className="text-sm leading-snug text-amtrak-yellow-700">
            Info from this train is {formatDuration(minsSinceLastUpdate)} old.
            Its current location is estimated.
          </span>
        )}
      </div>

      <Timeline stations={train.stations} trainStatus={trainStatus} />
    </div>
  )
}
