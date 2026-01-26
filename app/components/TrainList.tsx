import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import cn from 'classnames'
import { classNames, TRAIN_QUERY_PARAMS } from '../constants'
import { Train, TrainQueryParams } from '../types'
import {
  findTrainsFromSegment,
  formatDate,
  getScheduledTime,
  getTrainMeta,
} from '../utils'
import StatusBadge from './StatusBadge'
import CaretRight from '../img/caret-right.svg'
import NoTrain from '../img/no-train.svg'
import { useSettings } from '../providers/settings'

const filterToDisplayName: Record<string, string> = {
  from: 'From',
  to: 'To',
  trainName: 'Name',
  trainNumber: 'Number',
}

interface TrainListProps {
  trains: Train[]
  params: TrainQueryParams
}

function TrainList({ trains, params }: TrainListProps) {
  const router = useRouter()
  const { settings } = useSettings()
  const { timeZone } = settings
  const searchParams = useMemo(
    () =>
      Object.entries(params).filter(
        ([key, val]) => TRAIN_QUERY_PARAMS.search.includes(key) && val,
      ),
    [params],
  )

  const filteredTrains = useMemo(() => {
    let filteredTrains = trains
    if (params.from && params.to) {
      filteredTrains = findTrainsFromSegment(trains, params.from, params.to)
    }
    if (params.trainName) {
      filteredTrains = filteredTrains.filter((t) => t.name === params.trainName)
    }
    if (params.trainNumber) {
      filteredTrains = filteredTrains.filter(
        (t) => t.number === params.trainNumber,
      )
    }
    if (params.agency) {
      filteredTrains = filteredTrains.filter((t) =>
        t.id.startsWith(params.agency!),
      )
    }
    filteredTrains = filteredTrains.toSorted((a, b) => {
      if (params.sort === 'name') {
        return a.name.localeCompare(b.name)
      } else if (params.sort === 'number') {
        return parseInt(a.number) - parseInt(b.number)
      } else if (params.sort === 'delay') {
        return getTrainMeta(a).delay - getTrainMeta(b).delay
      } else {
        // params.sort === 'updated' (default sort)
        // treat more recently updated trains as the "smaller" values
        return (b.updated?.valueOf() ?? 0) - (a.updated?.valueOf() ?? 0)
      }
    })
    if (params.sortDir === 'desc') {
      filteredTrains = filteredTrains.toReversed()
    }
    return filteredTrains
  }, [trains, params])

  useEffect(() => {
    // if there's a single result, navigate to the train detail page
    // rather than to the search results list
    if (filteredTrains.length === 1) {
      router.push(`/train/${filteredTrains[0].id}`)
    }
  }, [filteredTrains, router])

  const clearSearchParams = () => {
    const url = new URL(window.location.origin)
    router.push(url.toString())
  }

  const renderSearchParams = () => (
    <div className="m-3 flex justify-between gap-2 rounded-lg bg-yellow-100 p-3 text-yellow-900">
      <div className="flex gap-2 leading-snug">
        {searchParams.map(([key, value]) => (
          <span key={key} className="flex flex-wrap items-center gap-x-1">
            <span className="text-sm">{filterToDisplayName[key]}:</span>
            <strong>{value}</strong>
          </span>
        ))}
      </div>
      <button
        className="text-amtrak-blue-500 hover:text-amtrak-blue-400 cursor-pointer font-semibold"
        onClick={clearSearchParams}
      >
        Clear
      </button>
    </div>
  )

  const renderList = () => {
    if (filteredTrains.length === 0) {
      return (
        <div
          className={cn(
            'mx-auto my-6 flex flex-col gap-2 text-center text-lg',
            classNames.textDeemphasized,
          )}
        >
          <NoTrain className="text-positron-gray-400 mx-auto max-w-16" />
          No trains found
        </div>
      )
    }
    const queryString = new URLSearchParams(params).toString()
    return (
      <ul className="flex flex-col">
        {filteredTrains.map((train) => (
          <Link
            key={train.id}
            href={`/train/${train.id}?${queryString}`}
            className="hover:bg-amtrak-blue-200/25 p-3"
          >
            <li key={train.id} className="flex flex-col gap-2">
              <h2 className="flex items-start justify-between gap-2 leading-tight font-bold">
                <span className="mr-2">
                  {train.name}{' '}
                  <span className={classNames.textAccent}>{train.number}</span>
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 font-semibold text-nowrap',
                    classNames.textDeemphasized,
                  )}
                >
                  {train.stops[0].code}
                  <CaretRight
                    alt="to"
                    className="fill-positron-gray-600 dark:fill-positron-gray-300 inline w-2"
                  />
                  {train.stops[train.stops.length - 1].code}
                </span>
              </h2>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge train={train} className="text-sm" />
                <span className={cn('font-sm', classNames.textDeemphasized)}>
                  {train.stops[0].departure.time &&
                    train.stops[0].timezone &&
                    formatDate(
                      getScheduledTime(train.stops[0].departure)!,
                      timeZone === 'local'
                        ? train.stops[0].timezone
                        : undefined,
                    )}
                </span>
              </div>
            </li>
          </Link>
        ))}
      </ul>
    )
  }

  return (
    <>
      {searchParams.length > 0 && renderSearchParams()}
      {renderList()}
    </>
  )
}

export default TrainList
