'use client'

import cn from 'classnames'
import { JSX, useMemo } from 'react'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  formatDate,
  formatDuration,
  formatTime,
  getOffset,
  getTrainParams,
  getTrainMeta,
  msToMins,
  getScheduledTime,
  kmhToMph,
  headingToDirection,
} from '@/app/utils'
import StatusBadge from '@/app/components/StatusBadge'
import CaretRight from '@/app/img/caret-right.svg'
import Pie from '@/app/img/pie.svg'
import Warning from '@/app/img/warning.svg'
import Pointer from '@/app/img/pointer.svg'
import { classNames } from '@/app/constants'
import { useTrains } from '@/app/providers/train'
import { useSettings } from '@/app/providers/settings'
import CurrentSegment from '@/app/components/CurrentSegment'
import { TimeStatus, Train, TrainMeta } from '@/app/types'
import Timeline from '@/app/components/Timeline'
import Crosshair from '@/app/img/crosshair.svg'
import ChevronLeft from '@/app/img/chevron-left.svg'
import { useBottomSheet } from '@/app/providers/bottomSheet'

export default function TrainDetail() {
  const { agency, id } = useParams()
  const TrainQueryParams = getTrainParams(useSearchParams())
  const { trains } = useTrains()
  const { setPosition } = useBottomSheet()
  const { settings, updateSetting } = useSettings()
  const { timeFormat, timeZone, follow } = settings
  const train = useMemo(
    () => trains.find((t) => t.id === `${agency}/${id}`),
    [trains, agency, id],
  )

  if (!train) {
    console.log('*** Train disappeared:', train, trains)
    return <h1>Not found</h1>
  }

  const trainMeta = getTrainMeta(train)

  const handleFollow = () => {
    if (!follow) {
      // will switch to following
      setPosition('middle') // partially close bottom sheet to reveal map
    }
    updateSetting('follow', !follow)
  }

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
      <time>
        {formatTime(date, {
          tz: timeZone === 'local' ? tz : undefined,
          timeFormat,
        })}
        {' '}
        {formatDate(date, timeZone === 'local' ? tz : undefined)}
      </time>
      {displayTz ? (
        <div className={cn('text-sm', classNames.textDeemphasized)}>
          UTC<span className="font-semibold">{getOffset(tz) / 60}</span>
        </div>
      ) : (
        <div />
      )}
    </>
  )

  const renderTrainVelocity = (train: Train, trainMeta: TrainMeta) => {
    if (trainMeta.curStop) {
      return <span>At Station</span>
    }
    let speedEl,
      headingEl: JSX.Element | null = null
    if (train.speed !== null) {
      const isMiles = settings.units === 'miles'
      // speed is returned in mph by default
      const displaySpeed = isMiles ? kmhToMph(train.speed) : train.speed
      const unit = isMiles ? 'mph' : 'km/h'
      speedEl = (
        <span>
          {Math.round(displaySpeed)} {unit}
        </span>
      )
    }
    if (train.heading !== null) {
      headingEl = (
        <span className="flex items-baseline gap-1">
          <Pointer
            alt={train.heading}
            title={train.heading}
            className="w-4 self-center transition-all duration-1000 dark:fill-white"
            style={{
              transform: `rotate(${train.heading}deg)`,
            }}
          />
          <span>{headingToDirection(train.heading)}</span>
        </span>
      )
    }
    return (
      <>
        {speedEl}
        {headingEl}
      </>
    )
  }

  const timezonesDiffer = train.stops[0].timezone !== train.stops[0].timezone
  const hasTrainQueryParams = !!Object.entries(TrainQueryParams).length
  const minsSinceLastUpdate =
    train.updated && msToMins(new Date().getTime() - train.updated.valueOf())
  // last update is more than 10 minutes old
  const isStaleData =
    minsSinceLastUpdate &&
    ![TimeStatus.PREDEPARTURE, TimeStatus.COMPLETE].includes(trainMeta.code!) &&
    minsSinceLastUpdate > 10
  const { firstStop, lastStop } = trainMeta
  const scheduledDeparture = getScheduledTime(firstStop.departure)
  const scheduledArrival = getScheduledTime(lastStop.arrival)
  return (
    <div className="flex flex-col gap-5 p-3 pb-4">
      <Link
        href={`/?${new URLSearchParams(TrainQueryParams).toString()}`}
        className={cn(
          'hover:text-amtrak-blue-400 dark:hover:text-amtrak-blue-200 flex items-center gap-1 font-semibold',
          classNames.textAccent,
        )}
      >
        <ChevronLeft className="h-4" />{' '}
        {hasTrainQueryParams ? 'Back to Trains' : 'All Trains'}
      </Link>
      <h1 className="text-3xl font-bold">
        {train.name}{' '}
        <span className={classNames.textAccent}>{train.number}</span>
      </h1>
      <div
        className={cn(
          'grid grid-flow-col grid-cols-[1fr_auto_1fr] grid-rows-[repeat(4,auto)] border-y py-4 text-center leading-relaxed',
          classNames.sectionSeparator,
        )}
      >
        {scheduledDeparture &&
          renderRouteEndpoint({
            stationName: firstStop.name,
            stationCode: firstStop.code,
            date: scheduledDeparture,
            tz: firstStop.timezone,
            displayTz: timeZone === 'local' && timezonesDiffer,
          })}
        <CaretRight
          alt="to"
          className="fill-positron-gray-600 dark:fill-positron-gray-300 w-3 self-center"
        />
        <span />
        <span />
        <span />
        {scheduledArrival &&
          renderRouteEndpoint({
            stationName: lastStop.name,
            stationCode: lastStop.code,
            date: scheduledArrival,
            tz: lastStop.timezone,
            displayTz: timeZone === 'local' && timezonesDiffer,
          })}
      </div>
      <div className="flex items-baseline gap-3">
        <StatusBadge train={train} />
        {renderTrainVelocity(train, trainMeta)}
      </div>

      <CurrentSegment trainMeta={trainMeta} />

      <div className="flex justify-center gap-2">
        <label
          className={cn(
            'flex cursor-pointer items-center gap-[0.4em] rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors duration-300',
            {
              'border-black dark:border-white': !follow,
              'border-amtrak-yellow-200 bg-amtrak-yellow-100/50 dark:bg-amtrak-yellow-100/20':
                follow,
            },
          )}
        >
          <input
            type="checkbox"
            checked={follow}
            onChange={handleFollow}
            className="hidden"
          />
          <Crosshair className="inline h-4 w-4" /> Follow on Map
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'flex justify-between text-sm',
            classNames.textDeemphasized,
          )}
        >
          <span>
            Last update{' '}
            <time
              className={cn({
                'text-amtrak-yellow-500 dark:text-amtrak-yellow-300':
                  isStaleData,
              })}
            >
              {train.updated
                ? formatTime(train.updated, { timeFormat })
                : 'unknown'}
            </time>
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
              className="h-4 w-4 shrink-0 rounded-full border"
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

      <Timeline stops={train.stops} trainMeta={trainMeta} train={train} />
    </div>
  )
}
