'use client'

import { useMemo, useRef, useState } from 'react'
import { SelectInstance } from 'react-select'
import cn from 'classnames'
import { InputType, Option } from '../types'
import MagnifyingGlass from '../img/magnifying-glass.svg'
import CaretRight from '../img/caret-right.svg'
import { createRouteNumMap, getTrainNums } from '../utils'
import { useTrains } from '../providers/train'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchSelect from './SearchSelect'
import { useBottomSheet } from '../providers/bottomSheet'

enum SearchType {
  Segment,
  Line,
}

interface SearchProps {
  id: string
  className?: string
}

const getOption = (options: Option[], value: string | null) =>
  options.find((option) => option.value === value) || null

function Search({ id, className = '' }: SearchProps) {
  const router = useRouter()
  const query = useSearchParams()
  const { trains, stations } = useTrains()
  const { setPosition } = useBottomSheet()

  const routes = useMemo(() => createRouteNumMap(trains), [trains])
  const trainNums = useMemo(() => getTrainNums(trains), [trains])

  const stationOptions = useMemo(
    () =>
      stations
        .filter((s) => typeof s.code === 'string')
        .toSorted((a, b) => a.code.localeCompare(b.code))
        .map((station) => ({
          value: `${station.agency}/${station.code}`,
          code: station.code,
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

  const [routeName, setRouteName] = useState<Option | null>(
    getOption(routeOptions, query.get('routeName')),
  )

  const lineNumberOptions = useMemo(
    () =>
      // if a train is selected, only show numbers for that train
      // otherwise, show all train numbers
      Array.from(routes[routeName?.value || ''] || trainNums)
        ?.toSorted((a, b) => Number(a) - Number(b))
        ?.map((num) => ({
          value: num,
          label: num,
        })),
    [routes, routeName, trainNums],
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
        <div className="bg-positron-gray-200 rounded-full">
          <input
            type="radio"
            name="type"
            id={`${id}-segment`}
            value="segment"
            checked={searchType === SearchType.Segment}
            onChange={() => setSearchType(SearchType.Segment)}
            className="hidden"
          />
          <label
            htmlFor={`${id}-segment`}
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
            id={`${id}-line`}
            value="line"
            checked={searchType === SearchType.Line}
            onChange={() => setSearchType(SearchType.Line)}
            className="hidden"
          />
          <label
            htmlFor={`${id}-line`}
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
          <strong className="mr-2">{option.code}</strong>
          {option.label}
        </>
      )}
      required={true}
      autoFocus={isFrom}
    />
  )

  const renderSegmentSearch = () => (
    <div className="flex grow items-center gap-2">
      {renderSegmentOption(true)}
      <CaretRight alt="" className="w-2 fill-white" />
      {renderSegmentOption(false)}
    </div>
  )

  const renderLineSearch = () => (
    <div className="flex grow gap-2">
      <SearchSelect
        instanceId="routeName"
        name="routeName"
        options={routeOptions}
        value={routeName}
        className="grow text-black"
        placeholder="Route name"
        onChange={(option) => {
          setRouteName(option as Option)
          setTrainNumber(null)
          if (option) {
            trainNumberSelect.current?.focus()
          }
        }}
        autoFocus={true}
      />
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
        onChange={(option) => {
          setTrainNumber(option as Option)
        }}
        onFocus={() => setTrainNumber(null)}
        inputType={InputType.NUMBER}
      />
    </div>
  )

  const handleSubmit = (formData: FormData) => {
    const url = new URL(window.location.origin)
    if (searchType === SearchType.Segment) {
      const from = formData.get('from') as string
      const to = formData.get('to') as string
      url.searchParams.set('from', from.split('/')[1]) // only keep station code, not agency
      url.searchParams.set('to', to.split('/')[1])
    } else {
      url.searchParams.set('routeName', formData.get('routeName') as string)
      url.searchParams.set('trainNumber', formData.get('trainNumber') as string)
    }
    router.push(url.toString())
    // blur any focused input to close the mobile keyboard
    document.documentElement.blur()
    setPosition('middle') // open mobile bottom sheet
  }

  return (
    <form
      id="search"
      className={cn(
        'bg-amtrak-midnight-blue sticky top-0 z-20 flex flex-col gap-3 px-3 py-4 text-white shadow-md',
        className,
      )}
      action={handleSubmit}
    >
      {renderSearchOptions()}
      <div className="flex gap-2">
        {searchType === SearchType.Segment
          ? renderSegmentSearch()
          : renderLineSearch()}
        <button
          aria-label="Search"
          className="bg-amtrak-blue-500 active:bg-amtrak-blue-600 shrink-0 rounded px-2 hover:cursor-pointer"
        >
          <MagnifyingGlass
            alt="Search"
            title="Search"
            className="w-6 fill-white"
          />
        </button>
      </div>
    </form>
  )
}

export default Search
