import Image from 'next/image'

import { Train } from '../types'
import { findTrainsFromSegment, getTrainStatus } from '../utils'
import StatusBadge from './StatusBadge'
import CaretRight from '../img/caret-right-gray.svg'
import Spinner from '../img/spinner.svg'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const formatDay = (date: Date, tz: string) =>
  new Intl.DateTimeFormat(Intl.DateTimeFormat().resolvedOptions().locale, {
    month: 'numeric',
    day: 'numeric',
    timeZone: tz,
  }).format(date)

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
  filters: {
    from: string | null
    to: string | null
    trainName: string | null
    trainNumber: string | null
  }
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
  }, [filteredTrains])

  const clearFilters = () => {
    const url = new URL(window.location.origin)
    router.push(url.toString())
  }

  const renderFilters = () => (
    <div className="bg-yellow-100 text-yellow-900 m-3 p-3 rounded-lg flex gap-2 justify-between">
      <div className="flex gap-2 leading-snug">
        {Object.entries(filters)
          .filter(([_, value]) => value)
          .map(([key, value]) => (
            <span key={key} className="flex flex-wrap gap-x-2 items-baseline">
              <span className="uppercase text-sm">
                {filterToDisplayName[key]}
              </span>{' '}
              <strong>{value}</strong>
            </span>
          ))}
      </div>
      <button
        className="text-amtrak-blue-500 font-semibold"
        onClick={clearFilters}
      >
        Clear
      </button>
    </div>
  )

  const renderList = () => {
    if (filteredTrains.length === 0) {
      return (
        <div className="my-5 mx-auto text-lg text-center text-positron-gray-600">
          No trains found
        </div>
      )
    }
    return (
      <ul className="flex flex-col my-2">
        {filteredTrains
          .toSorted((a, b) => a.updatedAt.valueOf() - b.updatedAt.valueOf())
          .map((train) => (
            <Link
              key={train.objectID}
              href={`/train/${train.objectID}`}
              className="p-3 hover:bg-amtrak-blue-500/25"
            >
              <li key={train.objectID} className="flex flex-col gap-2">
                <h2 className="font-bold flex items-start gap-2 leading-tight justify-between">
                  <span className="mr-2">
                    {train.routeName}{' '}
                    <span className="text-amtrak-blue-600">
                      {train.trainNum}
                    </span>
                  </span>
                  <span className="text-nowrap text-positron-gray-600 flex gap-1 items-center font-semibold">
                    {train.origCode}
                    <Image src={CaretRight} alt="to" className="inline" />
                    {train.destCode}
                  </span>
                </h2>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge train={train} className="text-sm" />
                  <span className="font-light">
                    {formatDay(train.stations[0].schDep, train.stations[0].tz)}
                  </span>
                </div>
              </li>
            </Link>
          ))}
      </ul>
    )
  }

  if (loading) {
    return <Image src={Spinner} alt="Loading" className="my-5 mx-auto w-10" />
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
