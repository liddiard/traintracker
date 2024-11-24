'use client'

import { useState } from 'react'
import Select from 'react-select'

enum SearchType {
  Route,
  Number,
}

function Search() {
  const [searchType, setSearchType] = useState<SearchType>(SearchType.Route)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [route, setRoute] = useState('')
  const [trainNumber, setTrainNumber] = useState('')

  const renderRouteSearch = () => (
    <>
      <label htmlFor="from">From</label>
      <input
        name="from"
        id="from"
        onChange={(e) => setFrom(e.target.value)}
        value={from}
      />
      <label htmlFor="to">To</label>
      <input name="to" id="to" />
    </>
  )

  const renderNumberSearch = () => (
    <>
      <select name="route"></select>
      <input
        type="number"
        name="number"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(e) => setTrainNumber(e.target.value)}
        value={trainNumber}
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
      {searchType === SearchType.Route
        ? renderRouteSearch()
        : renderNumberSearch()}
      <button aria-label="Search">Search</button>
    </form>
  )
}

export default Search
