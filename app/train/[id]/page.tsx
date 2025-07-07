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
import cn from 'classnames'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right.svg'
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
      <div className="text-positron-gray-600 dark:text-positron-gray-300 mb-2 leading-tight font-semibold">
        {stationName}
      </div>
      <div>
        {formatDate(date, tz)}, {formatTime(date, tz)}
      </div>
      {displayTz ? (
        <div className="text-positron-gray-600 dark:text-positron-gray-300 text-sm">
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
            <Pointer
              alt={train.heading}
              title={train.heading}
              className="w-4 self-center transition-all duration-1000 dark:fill-white"
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
  const minsSinceLastUpdate = msToMins(Date.now() - train.updatedAt.valueOf())
  // last update is more than 10 minutes old
  const isStaleData =
    ![TimeStatus.PREDEPARTURE, TimeStatus.COMPLETE].includes(
      trainStatus.code!,
    ) && minsSinceLastUpdate > 10
  return (
    <div className="flex flex-col gap-5 p-3 pb-4">
      <Link
        href={`/?${new URLSearchParams(trainSearchParams).toString()}`}
        className="text-amtrak-blue-500 hover:text-amtrak-blue-400 dark:text-amtrak-blue-300 dark:hover:text-amtrak-blue-200 font-semibold"
      >
        {hasTrainSearchParams ? '← Back to Search' : '← All Trains'}
      </Link>
      <h1 className="text-3xl font-bold">
        {train.routeName}{' '}
        <span className="text-amtrak-blue-500 dark:text-amtrak-blue-300">
          {train.trainNum}
        </span>
      </h1>
      <div className="border-positron-gray-200 dark:border-positron-gray-700 grid grid-flow-col grid-cols-[1fr_auto_1fr] grid-rows-[repeat(4,auto)] border-y py-4 text-center leading-relaxed">
        {renderRouteEndpoint({
          stationName: train.origName,
          stationCode: train.origCode,
          date: trainStatus.firstStation.schArr,
          tz: train.originTZ,
          displayTz: timezonesDiffer,
        })}
        <CaretRight
          alt="to"
          className="fill-positron-gray-600 dark:fill-positron-gray-300 w-3 self-center"
        />
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
        <div className="text-positron-gray-600 dark:text-positron-gray-300 flex justify-between text-sm">
          <span>
            Last update{' '}
            <span
              className={cn({
                'text-amtrak-yellow-600 dark:text-amtrak-yellow-300':
                  isStaleData,
              })}
            >
              {formatTime(train.updatedAt)}
            </span>
            {isStaleData && (
              <Warning
                alt="caution"
                className="fill-amtrak-yellow-600 dark:fill-amtrak-yellow-300 mx-1 inline w-4 align-text-top"
              />
            )}
          </span>
          <span className="flex items-center gap-2">
            Next check
            <Pie
              alt="every 15 seconds"
              className="border-positron-gray-600 dark:border-positron-gray-200 h-4 w-4 shrink-0 rounded-full border"
            />
          </span>
        </div>
        {isStaleData && (
          <span className="text-amtrak-yellow-600 dark:text-amtrak-yellow-300 text-sm leading-snug">
            Info from this train is {formatDuration(minsSinceLastUpdate)} old.
            Its current location is estimated.
          </span>
        )}
      </div>

      <Timeline stations={train.stations} trainStatus={trainStatus} />
    </div>
  )
}
