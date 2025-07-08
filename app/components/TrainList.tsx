import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import cn from 'classnames'
import { classNames } from '../constants'
import { Train, TrainSearchParams } from '../types'
import { findTrainsFromSegment, formatDate } from '../utils'
import StatusBadge from './StatusBadge'
import CaretRight from '../img/caret-right.svg'
import Spinner from '../img/spinner.svg'

const filterToDisplayName: Record<string, string> = {
  from: 'From',
  to: 'To',
  trainName: 'Name',
  trainNumber: 'Number',
}

function TrainList({
  trains,
  filters,
}: {
  trains: Train[]
  filters: TrainSearchParams
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const filteredTrains = useMemo(() => {
    let filteredTrains = trains
    if (filters.from && filters.to) {
      filteredTrains = findTrainsFromSegment(trains, filters.from, filters.to)
    }
    if (filters.trainName) {
      filteredTrains = filteredTrains.filter(
        (t) => t.routeName === filters.trainName,
      )
    }
    if (filters.trainNumber) {
      filteredTrains = filteredTrains.filter(
        (t) => t.trainNum === filters.trainNumber,
      )
    }
    return filteredTrains
  }, [trains, filters])

  useEffect(() => {
    if (filteredTrains.length === 1) {
      setLoading(true)
      router.push(`/train/${filteredTrains[0].objectID}`)
    }
  }, [filteredTrains, router])

  const clearFilters = () => {
    const url = new URL(window.location.origin)
    router.push(url.toString())
  }

  const renderFilters = () => (
    <div className="m-3 flex justify-between gap-2 rounded-lg bg-yellow-100 p-3 text-yellow-900">
      <div className="flex gap-2 leading-snug">
        {Object.entries(filters)
          .filter(([_, value]) => value)
          .map(([key, value]) => (
            <span key={key} className="flex flex-wrap items-center gap-x-1">
              <span className="text-sm">{filterToDisplayName[key]}:</span>
              <strong>{value}</strong>
            </span>
          ))}
      </div>
      <button
        className="text-amtrak-blue-500 hover:text-amtrak-blue-400 font-semibold"
        onClick={clearFilters}
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
            'mx-auto my-5 text-center text-lg',
            classNames.textDeemphasized,
          )}
        >
          No trains found
        </div>
      )
    }
    const queryString = new URLSearchParams(filters).toString()
    return (
      <ul className="my-2 flex flex-col">
        {filteredTrains
          .toSorted((a, b) => a.updatedAt.valueOf() - b.updatedAt.valueOf())
          .map((train) => (
            <Link
              key={train.objectID}
              href={`/train/${train.objectID}?${queryString}`}
              className="hover:bg-amtrak-blue-200/25 p-3"
            >
              <li key={train.objectID} className="flex flex-col gap-2">
                <h2 className="flex items-start justify-between gap-2 leading-tight font-bold">
                  <span className="mr-2">
                    {train.routeName}{' '}
                    <span className={classNames.textAccent}>
                      {train.trainNum}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 font-semibold text-nowrap',
                      classNames.textDeemphasized,
                    )}
                  >
                    {train.origCode}
                    <CaretRight
                      alt="to"
                      className="fill-positron-gray-600 dark:fill-positron-gray-300 inline w-2"
                    />
                    {train.destCode}
                  </span>
                </h2>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge train={train} className="text-sm" />
                  <span className={cn('font-sm', classNames.textDeemphasized)}>
                    {formatDate(train.stations[0].schDep, train.stations[0].tz)}
                  </span>
                </div>
              </li>
            </Link>
          ))}
      </ul>
    )
  }

  if (loading) {
    return <Spinner alt="Loading" className="mx-auto my-5 w-10" />
  }

  return (
    <>
      {Object.values(filters).some((value) => value !== null) &&
        renderFilters()}
      {renderList()}
    </>
  )
}

export default TrainList
