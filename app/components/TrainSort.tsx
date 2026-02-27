import { Fragment } from 'react'
import cn from 'classnames'
import SortAsc from '../img/sort-asc.svg'
import SortDesc from '../img/sort-desc.svg'
import { useRouter } from 'next/navigation'

const sortOptions = {
  number: 'Train number',
  name: 'Route name',
  updated: 'Last updated',
  delay: 'Delay',
}

const agencies = [
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
    selected: 'bg-via-red-400',
  },
  {
    name: 'Brightline',
    value: 'brightline',
    selected: 'bg-brightline-yellow-100 text-black!',
  },
]

interface TrainSortParams {
  sort?: string
  sortDir?: string
  agency?: string
}

function TrainSort({ sort = 'number', sortDir, agency = '' }: TrainSortParams) {
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
    url.searchParams.set('agency', newOperator)
    router.push(url.toString())
  }

  const SortIcon = sortDir === 'desc' ? SortDesc : SortAsc
  const actionText =
    sortDir === 'desc'
      ? 'Current sort: descending. Click for ascending sort.'
      : 'Current sort: ascending. Click for descending sort.'
  return (
    <div className="mx-3 mt-4 mb-2 flex flex-col gap-2">
      <div className="dark:after:to-positron-gray-800 relative [scrollbar-width:thin] after:pointer-events-none after:absolute after:top-0 after:right-0 after:block after:h-full after:w-4 after:bg-linear-to-r after:from-transparent after:to-white">
        <div className="flex gap-2 overflow-x-auto pr-4">
          {agencies.map(({ name, value, selected }) => (
            <Fragment key={value}>
              <input
                id={`agency-${value}`}
                type="radio"
                name="agency"
                value={value}
                onChange={handleOperatorChange}
                checked={value === agency}
                className="hidden"
              />
              <label
                htmlFor={`agency-${value}`}
                tabIndex={0}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1',
                  value === agency
                    ? `font-semibold text-white ${selected}`
                    : 'cursor-pointer font-medium inset-ring-2 inset-ring-black dark:inset-ring-white',
                )}
              >
                {name}
              </label>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center">
          <label htmlFor="sort">Sort by:</label>
          <select
            id="sort"
            value={sort}
            onChange={handleSortChange}
            className="hover:bg-positron-gray-400/15 cursor-pointer rounded-full border-r-6 border-transparent py-2 pr-1 pl-2 font-semibold"
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
