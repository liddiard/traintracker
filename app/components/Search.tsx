'use client'

import { useState } from 'react'
import Select, { ActionMeta } from 'react-select'
import Image from 'next/image'
import cn from 'classnames'

import { Train, Station, Route, Option } from '../types'
import MagnifyingGlass from '../img/magnifying-glass.svg'
import CaretRight from '../img/caret-right-white.svg'

enum SearchType {
  Segment,
  Line,
}

const selectClassNames = {
  indicatorsContainer: () => '!hidden',
  menu: () => '!min-w-40',
  control: () =>
    '!bg-white !bg-opacity-10 !border !border-white !border-opacity-50',
  singleValue: () => '!text-white',
  input: () => '!text-white cursor-text',
  placeholder: () => '!text-white !text-opacity-50',
}

function Search({
  trains,
  stations,
  routes,
}: {
  trains: Train[]
  stations: Station[]
}) {
  const [searchType, setSearchType] = useState<SearchType>(SearchType.Segment)
  const [from, setFrom] = useState<Option | null>(null)
  const [to, setTo] = useState<Option | null>(null)
  const [trainName, setTrainName] = useState<Option | null>(null)
  const [trainNumber, setTrainNumber] = useState('')

  const getStationOptions = () =>
    stations
      .toSorted((a, b) => a.code.localeCompare(b.code))
      .map((station) => ({
        value: station.code,
        label: station.name,
      }))

  const getRouteOptions = () =>
    Object.keys(routes)
      .toSorted((a, b) => a.localeCompare(b))
      .map((route) => ({
        value: route,
        label: route,
      }))

  const renderSegmentOption = (isFrom: boolean) => (
    <Select
      options={getStationOptions()}
      value={isFrom ? from : to}
      placeholder={isFrom ? 'From' : 'To'}
      className="w-1/2 text-black"
      onChange={(option: Option | null) => {
        const setFunc = isFrom ? setFrom : setTo
        setFunc(option)
      }}
      classNames={selectClassNames}
      formatOptionLabel={(option: Option) => (
        <>
          <strong className="mr-2">{option.value}</strong>
          {option.label}
        </>
      )}
    />
  )

  const renderSegmentSearch = () => (
    <div className="flex flex-grow items-center gap-1">
      {renderSegmentOption(true)}
      <Image src={CaretRight} alt="" />
      {renderSegmentOption(false)}
    </div>
  )

  const renderLineSearch = () => (
    <div className="flex flex-grow gap-2">
      <Select
        options={getRouteOptions()}
        value={trainName}
        className="flex-grow text-black"
        placeholder="Name"
        classNames={selectClassNames}
        onChange={(option: Option | null) => {
          setTrainName(option)
        }}
      />
      <input
        name="number"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(e) => setTrainNumber(e.target.value)}
        value={trainNumber}
        className={cn(selectClassNames.control(), 'w-12 px-2 rounded')}
        placeholder="#"
      />
    </div>
  )

  const renderSearchOptions = () => {
    const labelClassNames =
      'inline-block py-1 px-3 text-black cursor-pointer rounded-full'
    const selectedLabelClassNames =
      'bg-amtrak-blue-500 text-white cursor-default font-semibold'
    return (
      <div className="flex items-center gap-2">
        Find a train by
        <div className="bg-gray-300 rounded-full">
          <input
            type="radio"
            name="type"
            id="segment"
            value="segment"
            checked={searchType === SearchType.Segment}
            onChange={() => setSearchType(SearchType.Segment)}
            className="hidden"
          />
          <label
            htmlFor="segment"
            className={cn(labelClassNames, {
              [selectedLabelClassNames]: searchType === SearchType.Segment,
            })}
          >
            Route
          </label>
          <input
            type="radio"
            name="type"
            id="line"
            value="line"
            checked={searchType === SearchType.Line}
            onChange={() => setSearchType(SearchType.Line)}
            className="hidden"
          />
          <label
            htmlFor="line"
            className={cn(labelClassNames, {
              [selectedLabelClassNames]: searchType === SearchType.Line,
            })}
          >
            Number
          </label>
        </div>
      </div>
    )
  }

  return (
    <form
      id="search"
      className="bg-amtrak-deep-blue p-3 text-white flex flex-col gap-2"
    >
      {renderSearchOptions()}
      <div className="flex gap-2">
        {searchType === SearchType.Segment
          ? renderSegmentSearch()
          : renderLineSearch()}
        <button
          aria-label="Search"
          className="bg-amtrak-blue-500 px-2 rounded hover:bg-amtrak-blue-600 active:bg-amtrak-blue-700 shrink-0"
        >
          <Image
            src={MagnifyingGlass}
            alt="Search"
            title="Search"
            className="invert w-6"
          />
        </button>
      </div>
    </form>
  )
}

export default Search
