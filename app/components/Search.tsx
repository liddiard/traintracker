'use client'

import { useMemo, useRef, useState } from 'react'
import Select, {
  components,
  InputProps,
  SelectInstance,
  Theme,
} from 'react-select'
import Image from 'next/image'
import cn from 'classnames'
import { Option } from '../types'
import MagnifyingGlass from '../img/magnifying-glass.svg'
import CaretRight from '../img/caret-right-white.svg'
import { createRouteNumMap, createStationList } from '../utils'
import { useTrains } from '../providers/train'
import { useRouter } from 'next/navigation'
import search from '../actions/search'

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
  placeholder: () => '!text-white !text-opacity-60',
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
  <components.Input
    {...props}
    // fix React hydration issue: https://github.com/JedWatson/react-select/issues/5459#issuecomment-1875022105
    aria-activedescendant={undefined}
  />
)

const NumberInput = (props: InputProps<Option>) => (
  <components.Input
    {...props}
    inputMode="numeric"
    pattern="[0-9]*"
    aria-activedescendant={undefined}
  />
)

function Search() {
  const router = useRouter()
  const { trains } = useTrains()

  const [searchType, setSearchType] = useState<SearchType>(SearchType.Segment)
  const [from, setFrom] = useState<Option | null>(null)
  const [to, setTo] = useState<Option | null>(null)
  const [trainName, setTrainName] = useState<Option | null>(null)
  const [trainNumber, setTrainNumber] = useState<Option | null>(null)

  const toSegmentSelect = useRef<SelectInstance<Option> | null>(null)
  const trainNumberSelect = useRef<SelectInstance<Option> | null>(null)

  const stations = useMemo(() => createStationList(trains), [trains])
  const routes = useMemo(() => createRouteNumMap(trains), [trains])

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
        <div className="bg-positron-gray-200 rounded-full">
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
    <Select
      instanceId={isFrom ? 'from' : 'to'}
      ref={isFrom ? null : toSegmentSelect}
      name={isFrom ? 'from' : 'to'}
      options={getStationOptions()}
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
      classNames={selectClassNames}
      theme={selectTheme}
      formatOptionLabel={(option: Option) => (
        <>
          <strong className="mr-2">{option.value}</strong>
          {option.label}
        </>
      )}
      components={{ Input }}
      required={true}
      isClearable={true}
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
        instanceId="trainName"
        name="trainName"
        options={getRouteOptions()}
        value={trainName}
        className="flex-grow text-black"
        placeholder="Train name"
        classNames={selectClassNames}
        theme={selectTheme}
        onChange={(option) => {
          setTrainName(option as Option)
          setTrainNumber(null)
          if (option) {
            trainNumberSelect.current?.focus()
          }
        }}
        components={{ Input }}
        required={true}
        isClearable={true}
      />
      {trainName && (
        <Select
          instanceId="trainNumber"
          ref={trainNumberSelect}
          name="trainNumber"
          options={getLineNumberOptions()}
          value={trainNumber}
          className="text-black grow-0 w-20"
          placeholder="#"
          classNames={{
            ...selectClassNames,
            menu: () => '',
          }}
          theme={selectTheme}
          autoFocus={true}
          onChange={(option) => {
            setTrainNumber(option as Option)
          }}
          onFocus={() => setTrainNumber(null)}
          components={{ Input: NumberInput }}
          isClearable={true}
        />
      )}
    </div>
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { from, to, trainName, trainNumber } = e.target
    const url = new URL(window.location.origin)
    if (searchType === SearchType.Segment) {
      url.searchParams.set('from', from?.value)
      url.searchParams.set('to', to?.value)
    } else {
      url.searchParams.set('trainName', trainName?.value)
      url.searchParams.set('trainNumber', trainNumber?.value)
    }
    router.push(url.toString())
  }

  return (
    <form
      id="search"
      className="bg-amtrak-midnight-blue px-3 py-4 text-white flex flex-col gap-3 shadow-md sticky top-0"
      onSubmit={handleSubmit}
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
