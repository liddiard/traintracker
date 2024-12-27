'use client'

import { useMemo, useRef, useState } from 'react'
import { SelectInstance } from 'react-select'
import Image from 'next/image'
import cn from 'classnames'
import { InputType, Option } from '../types'
import MagnifyingGlass from '../img/magnifying-glass.svg'
import CaretRight from '../img/caret-right-white.svg'
import { createRouteNumMap, createStationList } from '../utils'
import { useTrains } from '../providers/train'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchSelect from './SearchSelect'

enum SearchType {
  Segment,
  Line,
}

const getOption = (options: Option[], value: string | null) =>
  options.find((option) => option.value === value) || null

function Search() {
  const router = useRouter()
  const query = useSearchParams()
  const { trains } = useTrains()

  const stations = useMemo(() => createStationList(trains), [trains])
  const routes = useMemo(() => createRouteNumMap(trains), [trains])

  const stationOptions = useMemo(
    () =>
      stations
        .toSorted((a, b) => a.code.localeCompare(b.code))
        .map((station) => ({
          value: station.code,
          label: station.name,
        })),
    [stations],
  )

  const routeOptions = useMemo(
    () =>
      Object.keys(routes)
        .toSorted((a, b) => a.localeCompare(b))
        .map((route) => ({
          value: route,
          label: route,
        })),
    [routes],
  )

  const [trainName, setTrainName] = useState<Option | null>(
    getOption(routeOptions, query.get('trainName')),
  )

  const lineNumberOptions = useMemo(
    () =>
      Array.from(routes[trainName?.value || ''] || new Set())
        ?.toSorted((a, b) => Number(a) - Number(b))
        ?.map((num) => ({
          value: num,
          label: num,
        })),
    [routes, trainName],
  )

  const [searchType, setSearchType] = useState<SearchType>(SearchType.Segment)
  const [from, setFrom] = useState<Option | null>(
    getOption(stationOptions, query.get('from')),
  )
  const [to, setTo] = useState<Option | null>(
    getOption(stationOptions, query.get('to')),
  )
  const [trainNumber, setTrainNumber] = useState<Option | null>(
    getOption(lineNumberOptions, query.get('trainNumber')),
  )

  const toSegmentSelect = useRef<SelectInstance<Option> | null>(null)
  const trainNumberSelect = useRef<SelectInstance<Option> | null>(null)

  /**
   * Returns a JSX element representing a search options component.
   *
   * This component lets the user choose between searching by route (segment)
   * or searching by train number (line).
   *
   * @returns {JSX.Element} JSX element for the search options component.
   */
  const renderSearchOptions = () => {
    const labelClassNames =
      'inline-block py-1 px-3 text-black cursor-pointer rounded-full'
    const selectedLabelClassNames =
      'bg-amtrak-blue-500 text-white cursor-default font-semibold'
    return (
      <div className="flex items-center gap-2">
        Find a train by
        <div className="rounded-full bg-positron-gray-200">
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
            tabIndex={0}
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
            tabIndex={0}
          >
            Number
          </label>
        </div>
      </div>
    )
  }

  const renderSegmentOption = (isFrom: boolean) => (
    <SearchSelect
      instanceId={isFrom ? 'from' : 'to'}
      ref={isFrom ? null : toSegmentSelect}
      name={isFrom ? 'from' : 'to'}
      options={stationOptions}
      value={isFrom ? from : to}
      placeholder={isFrom ? 'From' : 'To'}
      className="w-1/2 text-black"
      onChange={(option) => {
        const setFunc = isFrom ? setFrom : setTo
        setFunc(option as Option)
        if (isFrom && option) {
          toSegmentSelect.current?.focus()
        }
      }}
      formatOptionLabel={(option: Option) => (
        <>
          <strong className="mr-2">{option.value}</strong>
          {option.label}
        </>
      )}
      required={true}
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
      <SearchSelect
        instanceId="trainName"
        name="trainName"
        options={routeOptions}
        value={trainName}
        className="flex-grow text-black"
        placeholder="Train name"
        onChange={(option) => {
          setTrainName(option as Option)
          setTrainNumber(null)
          if (option) {
            trainNumberSelect.current?.focus()
          }
        }}
        required={true}
      />
      {trainName && (
        <SearchSelect
          instanceId="trainNumber"
          ref={trainNumberSelect}
          name="trainNumber"
          options={lineNumberOptions}
          value={trainNumber}
          className="w-20 grow-0 text-black"
          placeholder="#"
          classNames={{
            menu: () => '',
          }}
          autoFocus={true}
          onChange={(option) => {
            setTrainNumber(option as Option)
          }}
          onFocus={() => setTrainNumber(null)}
          inputType={InputType.NUMBER}
        />
      )}
    </div>
  )

  const handleSubmit = (formData: FormData) => {
    const url = new URL(window.location.href)
    if (searchType === SearchType.Segment) {
      url.query.set('from', formData.get('from') as string)
      url.query.set('to', formData.get('to') as string)
    } else {
      url.query.set('trainName', formData.get('trainName') as string)
      url.query.set('trainNumber', formData.get('trainNumber') as string)
    }
    router.push(url.toString())
  }

  return (
    <form
      id="search"
      className="sticky top-0 z-20 flex flex-col gap-3 bg-amtrak-midnight-blue px-3 py-4 text-white shadow-md"
      action={handleSubmit}
    >
      {renderSearchOptions()}
      <div className="flex gap-2">
        {searchType === SearchType.Segment
          ? renderSegmentSearch()
          : renderLineSearch()}
        <button
          aria-label="Search"
          className="shrink-0 rounded bg-amtrak-blue-500 px-2 hover:bg-amtrak-blue-600 active:bg-amtrak-blue-700"
        >
          <Image
            src={MagnifyingGlass}
            alt="Search"
            title="Search"
            className="w-6 invert"
          />
        </button>
      </div>
    </form>
  )
}

export default Search
