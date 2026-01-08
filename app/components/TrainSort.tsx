import { Fragment } from 'react'
import cn from 'classnames'
import SortAsc from '../img/sort-asc.svg'
import SortDesc from '../img/sort-desc.svg'
import { useRouter } from 'next/navigation'

const sortOptions = {
  updated: 'Last updated',
  name: 'Train name',
  number: 'Train number',
  delay: 'Delay',
}

const operators = [
  {
    name: 'All',
    value: '',
    selected: 'bg-amtrak-blue-500',
  },
  {
    name: 'Amtrak',
    value: 'amtrak',
    selected: 'bg-amtrak-deep-blue',
  },
  {
    name: 'VIA Rail',
    value: 'via',
    selected: 'bg-amtrak-red-500',
  },
  {
    name: 'Brightline',
    value: 'brightline',
    selected: 'bg-amtrak-yellow-200 text-black!',
  },
]

interface TrainSortParams {
  sort?: string
  sortDir?: string
  operator?: string
}

function TrainSort({ sort, sortDir, operator = '' }: TrainSortParams) {
  const router = useRouter()

  const handleSortChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const url = new URL(window.location.href)
    const newSort = ev.target.value
    url.searchParams.set('sort', newSort)
    router.push(url.toString())
  }

  const handleSortDirChange = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('sortDir', sortDir === 'desc' ? 'asc' : 'desc')
    router.push(url.toString())
  }

  const handleOperatorChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const url = new URL(window.location.href)
    const newOperator = ev.target.value
    url.searchParams.set('operator', newOperator)
    router.push(url.toString())
  }

  const SortIcon = sortDir === 'desc' ? SortDesc : SortAsc
  const actionText =
    sortDir === 'desc'
      ? 'Current sort: descending. Click for ascending sort.'
      : 'Current sort: ascending. Click for descending sort.'
  return (
    <div className="mt-4 mb-2 flex flex-col gap-2">
      <div className="relative flex gap-2 overflow-x-auto pl-3">
        {operators.map(({ name, value, selected }) => (
          <Fragment key={value}>
            <input
              id={`operator-${value}`}
              type="radio"
              name="operator"
              value={value}
              onChange={handleOperatorChange}
              checked={value === operator}
              className="hidden"
            />
            <label
              htmlFor={`operator-${value}`}
              tabIndex={0}
              className={cn(
                'shrink-0 rounded-full px-3 py-1',
                value === operator
                  ? `font-semibold text-white ${selected}`
                  : 'cursor-pointer font-medium inset-ring-2 inset-ring-black dark:inset-ring-white',
              )}
            >
              {name}
            </label>
          </Fragment>
        ))}
        <div className="sticky top-0 right-0 bottom-0 min-w-4 bg-linear-to-r from-transparent to-white" />
      </div>
      <div className="mx-3 flex items-center justify-between gap-1">
        <div className="flex items-center">
          <label htmlFor="sort">Sort by:</label>
          <select
            id="sort"
            value={sort}
            onChange={handleSortChange}
            className="hover:bg-positron-gray-400/15 cursor-pointer rounded-full border-r-6 border-transparent py-2 pl-3 font-semibold"
          >
            {Object.entries(sortOptions).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSortDirChange}
          className="hover:bg-positron-gray-400/15 cursor-pointer justify-self-end rounded p-1"
          title={actionText}
        >
          <SortIcon className="w-5" alt={actionText} />
        </button>
      </div>
    </div>
  )
}

export default TrainSort
