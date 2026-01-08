'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import cn from 'classnames'
import { useTrains } from '@/app/providers/train'
import { useSettings } from '@/app/providers/settings'
import {
  formatTime,
  getDelayColor,
  formatDate,
  getOffset,
  formatDuration,
} from '@/app/utils'
import { classNames } from '@/app/constants'
import { Train, Stop } from '@/app/types'
import { useMemo, useState, useEffect } from 'react'
import Pie from '@/app/img/pie.svg'
import ChevronLeft from '@/app/img/chevron-left.svg'

type Sequence = 'First' | 'Intermediate' | 'Last'
interface TrainStop {
  train: Train
  stop: Stop
  sequence: Sequence
}

export default function StationPage() {
  const { code } = useParams()
  const { trains, stations } = useTrains()
  const { settings } = useSettings()
  const { timeFormat, timeZone } = settings

  const stationCode = typeof code === 'string' ? code.toUpperCase() : ''
  const station = stations.find((s) => s.code === stationCode)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Real-time clock that updates every second
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Get all trains that stop at this station
  const trainsUsingStation: TrainStop[] = useMemo(
    () =>
      trains
        .filter((train) =>
          train.stops.some((stop) => stop.code === stationCode),
        )
        .map((train) => {
          const { stops } = train
          const stopIndex = stops.findIndex((stop) => stop.code === stationCode)
          return {
            train,
            stop: stops[stopIndex],
            sequence: (stopIndex === 0
              ? 'First'
              : stopIndex === stops.length - 1
                ? 'Last'
                : 'Intermediate') as Sequence,
          }
        })
        .toSorted(
          (a, b) =>
            a.stop.arrival.time.getTime() - b.stop.arrival.time.getTime(),
        ),
    [trains, stationCode],
  )

  // Timestamp of most recently updated train
  const lastUpdate = useMemo(
    () =>
      trainsUsingStation.reduce<Date | null>((acc, cur) => {
        const { updated } = cur.train
        if (!acc) {
          return updated
        } else if (!updated) {
          return acc
        } else if (updated > acc) {
          return updated
        } else {
          return acc
        }
      }, null),
    [trainsUsingStation],
  )

  // Split trains into past and upcoming based on departure time
  const now = useMemo(() => new Date(), [])
  const pastDepartures = useMemo(
    () => trainsUsingStation.filter(({ stop }) => stop.departure.time < now),
    [trainsUsingStation, now],
  )
  const upcomingDepartures = useMemo(
    () => trainsUsingStation.filter(({ stop }) => stop.departure.time >= now),
    [trainsUsingStation, now],
  )

  // Group trains by day
  const groupByDay = useMemo(
    () => (trainStops: TrainStop[]) => {
      const grouped = new Map<string, TrainStop[]>()
      trainStops.forEach((trainStop) => {
        const tz = timeZone === 'local' ? station?.timezone : undefined
        const dateKey = formatDate(trainStop.stop.departure.time, tz)
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey)!.push(trainStop)
      })
      return grouped
    },
    [timeZone, station?.timezone],
  )

  const pastByDay = useMemo(
    () => groupByDay(pastDepartures),
    [groupByDay, pastDepartures],
  )
  const upcomingByDay = useMemo(
    () => groupByDay(upcomingDepartures),
    [groupByDay, upcomingDepartures],
  )

  if (!station) {
    return (
      <div className="flex flex-col gap-4 p-3">
        <h1 className="text-3xl font-bold">Station Not Found</h1>
        <p>No station found with stationCode: {stationCode}</p>
      </div>
    )
  }

  const formatTimeOptions = {
    tz: timeZone === 'local' ? station.timezone : undefined,
    timeFormat,
  }

  const renderTimeCell = (time: Date, delay: number) => {
    if (!mounted) {
      // time rendering requires CSS variables that are only available on client side
      return null
    }

    const hasDelay = delay !== 0
    const delayColor = delay > 0 ? getDelayColor(delay) : undefined

    return (
      <div className="flex flex-col">
        <time
          className={cn('font-medium', {
            'dark:brightness-175': hasDelay && delay > 0,
            'text-amtrak-green-500 dark:brightness-175': hasDelay && delay < 0,
          })}
          style={{ color: delay > 0 ? delayColor : '' }}
        >
          {formatTime(time, formatTimeOptions)}
        </time>
        {hasDelay && (
          <span
            className={cn('text-sm leading-4', {
              'dark:brightness-175': delay > 0,
              'text-amtrak-green-500 dark:brightness-175': delay < 0,
            })}
            style={{ color: delay > 0 ? delayColor : '' }}
          >
            {formatDuration(delay, { shortenMins: true, relative: false })}{' '}
            {delay > 0 ? 'late' : 'early'}
          </span>
        )}
      </div>
    )
  }

  const renderTrainRow = ({ train, stop, sequence }: TrainStop) => {
    const { arrival, departure } = stop
    const sameTime = arrival.time.getTime() === departure.time.getTime()

    return (
      <tr
        key={`${train.id}-${stop.code}`}
        className={cn(
          'even:bg-positron-gray-400/10 border-b',
          classNames.sectionSeparator,
        )}
      >
        <td className="py-2 pl-3 align-top">
          <Link
            href={`/train/${train.id}`}
            className="font-semibold hover:underline"
          >
            <span>{train.name}</span>{' '}
            <span className="text-amtrak-blue-500 dark:text-amtrak-blue-300">
              {train.number}
            </span>
          </Link>
        </td>
        {/* If the train's stop at this station has the same arrival and departure
            times, AND this is NOT the train's first or last stop, display the time
            across both arrival and departure columns
        */}
        {sameTime && sequence === 'Intermediate' ? (
          <td colSpan={2} className="p-2 text-center align-top">
            {renderTimeCell(arrival.time, arrival.delay)}
          </td>
        ) : (
          <>
            <td className="p-2 text-center align-top">
              {sequence === 'First'
                ? '—'
                : renderTimeCell(arrival.time, arrival.delay)}
            </td>
            <td className="py-2 pr-3 text-center align-top">
              {sequence === 'Last'
                ? '—'
                : renderTimeCell(departure.time, departure.delay)}
            </td>
          </>
        )}
      </tr>
    )
  }

  const renderDayGroup = (dateKey: string, trainStops: TrainStop[]) => (
    <div key={dateKey} className="flex flex-col">
      <h3
        className={cn(
          'my-3 px-3 text-xl font-semibold',
          classNames.textDeemphasized,
        )}
      >
        {dateKey}
      </h3>
      <table className="w-full">
        <thead>
          <tr className="bg-amtrak-midnight-blue border-b border-black font-bold text-white dark:border-white">
            <th className="py-2 pl-3 text-left">Train</th>
            <th className="px-2 py-2">Arrival</th>
            <th className="py-2 pr-3">Departure</th>
          </tr>
        </thead>
        <tbody>{trainStops.map(renderTrainRow)}</tbody>
      </table>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 py-3">
      <header className="flex flex-col gap-3 px-3">
        <Link
          href="/"
          className={cn(
            'hover:text-amtrak-blue-400 dark:hover:text-amtrak-blue-200 flex items-center gap-1 font-semibold',
            classNames.textAccent,
          )}
        >
          <ChevronLeft className="h-4" /> All Trains
        </Link>
        <h1 className="text-3xl font-bold">
          <span className="text-amtrak-blue-500 dark:text-amtrak-blue-300">
            {station.code}
          </span>{' '}
          <span className="text-positron-gray-400">/</span> {station.name}
        </h1>

        <div className="flex gap-2 text-lg">
          Station time:
          <time className="font-semibold" suppressHydrationWarning>
            {formatTime(currentTime, {
              tz: station.timezone,
              timeFormat,
              seconds: true,
            })}
          </time>
          <span>
            UTC
            <span className="inline font-semibold">
              {getOffset(station.timezone) / 60}
            </span>
          </span>
        </div>
      </header>

      {trainsUsingStation.length === 0 ? (
        <p
          className={cn(
            'p-3 text-center text-lg text-balance',
            classNames.textDeemphasized,
          )}
        >
          No trains currently scheduled for this station.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pastDepartures.length > 0 && (
            <details>
              <summary className="cursor-pointer px-3 text-2xl font-bold">
                Past Departures
              </summary>
              <div className="flex flex-col gap-4">
                {Array.from(pastByDay.entries()).map(([dateKey, trainStops]) =>
                  renderDayGroup(dateKey, trainStops),
                )}
              </div>
            </details>
          )}

          {upcomingDepartures.length > 0 && (
            <details open>
              <summary className="cursor-pointer px-3 text-2xl font-bold">
                Upcoming Departures
              </summary>
              <div className="flex flex-col gap-4">
                {Array.from(upcomingByDay.entries()).map(
                  ([dateKey, trainStops]) =>
                    renderDayGroup(dateKey, trainStops),
                )}
              </div>
            </details>
          )}

          <footer
            className={cn(
              'flex flex-col gap-4 px-3 text-sm',
              classNames.textDeemphasized,
            )}
          >
            {lastUpdate && (
              <div className="flex justify-between">
                <span>
                  Last update{' '}
                  <time>{formatTime(lastUpdate, { timeFormat })}</time>
                </span>
                <span className="flex items-center gap-2">
                  Next check
                  <Pie
                    alt="every 15 seconds"
                    className="h-4 w-4 shrink-0 rounded-full border"
                  />
                </span>
              </div>
            )}
          </footer>
        </div>
      )}
    </div>
  )
}
