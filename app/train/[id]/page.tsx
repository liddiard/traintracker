'use client'

import {
  formatDate,
  formatDuration,
  formatTime,
  getOffset,
  getTrainParams,
  getTrainStatus,
  msToMins,
  mphToKmh,
} from '@/app/utils'
import cn from 'classnames'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right.svg'
import Pie from '@/app/img/pie.svg'
import Warning from '@/app/img/warning.svg'
import Pointer from '@/app/img/pointer.svg'
import { headingToRotationMap, classNames } from '@/app/constants'
import { useTrains } from '@/app/providers/train'
import { useSettings } from '@/app/providers/settings'
import CurrentSegment from '@/app/components/CurrentSegment'
import { TimeStatus, TrainStatus } from '@/app/types'
import Timeline from '@/app/components/Timeline'
import Link from 'next/link'

export default function TrainDetail() {
  const { id } = useParams()
  const trainSearchParams = getTrainParams(useSearchParams())
  const { trains } = useTrains()
  const { settings } = useSettings()
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
      <div
        className={cn(
          'mb-2 leading-tight font-semibold',
          classNames.textDeemphasized,
        )}
      >
        {stationName}
      </div>
      <div>
        {formatDate(date, tz)}, {formatTime(date, tz)}
      </div>
      {displayTz ? (
        <div className={cn('text-sm', classNames.textDeemphasized)}>
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
      const isKilometers = settings.units === 'kilometers'
      // speed is returned in mph by default
      const displaySpeed = isKilometers ? mphToKmh(velocity) : velocity
      const unit = isKilometers ? 'km/h' : 'mph'

      return (
        <>
          <span>
            {Math.round(displaySpeed)} {unit}
          </span>
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
        className={cn(
          'hover:text-amtrak-blue-400 dark:hover:text-amtrak-blue-200 font-semibold',
          classNames.textAccent,
        )}
      >
        {hasTrainSearchParams ? '← Back to Search' : '← All Trains'}
      </Link>
      <h1 className="text-3xl font-bold">
        {train.routeName}{' '}
        <span className={classNames.textAccent}>{train.trainNum}</span>
      </h1>
      <div
        className={cn(
          'grid grid-flow-col grid-cols-[1fr_auto_1fr] grid-rows-[repeat(4,auto)] border-y py-4 text-center leading-relaxed',
          classNames.sectionSeparator,
        )}
      >
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
        <div
          className={cn(
            'flex justify-between text-sm',
            classNames.textDeemphasized,
          )}
        >
          <span>
            Last update{' '}
            <span
              className={cn({
                'text-amtrak-yellow-500 dark:text-amtrak-yellow-300':
                  isStaleData,
              })}
            >
              {formatTime(train.updatedAt)}
            </span>
            {isStaleData && (
              <Warning
                alt="caution"
                className="fill-amtrak-yellow-500 dark:fill-amtrak-yellow-300 mx-1 inline w-4 align-text-top"
              />
            )}
          </span>
          <span className="flex items-center gap-2">
            Next check
            <Pie
              alt="every 15 seconds"
              className={cn(
                'h-4 w-4 shrink-0 rounded-full border',
                classNames.sectionSeparator,
              )}
            />
          </span>
        </div>
        {isStaleData && (
          <span className="text-amtrak-yellow-500 dark:text-amtrak-yellow-300 text-sm leading-snug">
            Info from this train is {formatDuration(minsSinceLastUpdate)} old.
            Its current location is estimated.
          </span>
        )}
      </div>

      <Timeline stations={train.stations} trainStatus={trainStatus} />
    </div>
  )
}
