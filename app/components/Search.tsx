'use client'

import { useState } from 'react'
import Select, { components, InputProps, Theme } from 'react-select'
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
    '!bg-white !bg-opacity-10 !border !border-white !border-opacity-60',
  singleValue: () => '!text-white',
  input: () => '!text-white cursor-text',
  placeholder: () => '!text-white !text-opacity-50',
}

const selectTheme = (theme: Theme) =>
  ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: 'rgba(22, 126, 166, 1)',
      primary25: 'rgba(22, 126, 166, 0.25)',
      primary50: 'rgba(22, 126, 166, 0.5)',
      primary75: 'rgba(22, 126, 166, 0.75)',
    },
  }) as Theme

const Input = (props: InputProps<Option>) => (
  <components.Input {...props} inputMode="numeric" pattern="[0-9]*" />
)

function Search({
  trains,
  stations,
  routes,
}: {
  trains: Train[]
  stations: Station[]
  routes: Route
}) {
  const [searchType, setSearchType] = useState<SearchType>(SearchType.Segment)
  const [from, setFrom] = useState<Option | null>(null)
  const [to, setTo] = useState<Option | null>(null)
  const [trainName, setTrainName] = useState<Option | null>(null)
  const [trainNumber, setTrainNumber] = useState<Option | null>(null)

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

  const getLineNumberOptions = () =>
    Array.from(routes[trainName?.value || ''] || new Set())
      ?.toSorted((a, b) => Number(a) - Number(b))
      ?.map((num) => ({
        value: num,
        label: num,
      }))

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
      theme={selectTheme}
      formatOptionLabel={(option: Option) => (
        <>
          <strong className="mr-2">{option.value}</strong>
          {option.label}
        </>
      )}
    />
  )

  const renderSegmentSearch = () => (
    <div className="flex flex-grow items-center gap-2">
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
        theme={selectTheme}
        onChange={(option) => {
          setTrainName(option)
          setTrainNumber(null)
        }}
      />
      {trainName && (
        <Select
          options={getLineNumberOptions()}
          value={trainNumber}
          className="text-black grow-0 w-20"
          placeholder="#"
          classNames={{
            ...selectClassNames,
            menu: () => '',
          }}
          theme={selectTheme}
          onChange={(option) => {
            setTrainNumber(option as Option | null)
          }}
          onFocus={() => setTrainNumber(null)}
          components={{ Input }}
        />
      )}
    </div>
  )

  return (
    <form
      id="search"
      className="bg-amtrak-midnight-blue px-3 py-4 text-white flex flex-col gap-3 shadow-md"
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
