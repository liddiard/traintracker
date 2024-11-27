'use client'

import { ChangeEvent, useState } from 'react'
import Select from 'react-select'
import { Train, Station } from '../types'

enum SearchType {
  Route,
  Number,
}

function Search({
  trains,
  stations,
  routes,
}: {
  trains: Train[]
  stations: Station[]
}) {
  const [searchType, setSearchType] = useState<SearchType>(SearchType.Route)
  const [from, setFrom] = useState({})
  const [to, setTo] = useState({})
  const [trainNumber, setTrainNumber] = useState('')

  const getStationOptions = () =>
    stations
      .toSorted((a, b) => a.code.localeCompare(b.code))
      .map((station) => ({
        value: station.code,
        label: `${station.code} - ${station.name}`,
      }))

  const getRouteOptions = () =>
    routes
      .toSorted((a, b) => a.code.localeCompare(b.code))
      .map((route) => ({
        value: route.code,
        label: `${route.code} - ${route.name}`,
      }))

  const renderRouteSearch = () => (
    <>
      <Select
        options={getStationOptions()}
        value={from}
        className="w-1/2"
        styles={{
          menu: (base, props) => ({
            ...base,
            width: '100%',
          }),
        }}
      />
      <Select options={getStationOptions()} value={to} className="w-1/2" />
      {/* <label htmlFor="from">From</label>
      <input
        name="from"
        id="from"
        onChange={(e) => setFrom(e.target.value)}
        value={from}
      />
      <label htmlFor="to">To</label>
      <input
        name="to"
        id="to"
        onChange={(e) => setTo(e.target.value)}
        value={to}
      /> */}
    </>
  )

  const renderNumberSearch = () => (
    <>
      <Select options={getStationOptions()} className="flex-grow" />
      <input
        name="number"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(e) => setTrainNumber(e.target.value)}
        value={trainNumber}
        className="w-12 p-2"
      />
    </>
  )

  return (
    <form id="search">
      <div>
        Find a train by
        <input
          type="radio"
          name="type"
          checked={searchType === SearchType.Route}
          onChange={() => setSearchType(SearchType.Route)}
        />
        <label htmlFor="route">Route</label>
        <input
          type="radio"
          name="type"
          value="number"
          checked={searchType === SearchType.Number}
          onChange={() => setSearchType(SearchType.Number)}
        />
        <label htmlFor="number">Number</label>
      </div>
      <div className="flex gap-2">
        {searchType === SearchType.Route
          ? renderRouteSearch()
          : renderNumberSearch()}
        <button aria-label="Search">Search</button>
      </div>
    </form>
  )
}

export default Search
