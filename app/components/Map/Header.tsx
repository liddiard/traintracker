import Link from 'next/link'
import cn from 'classnames'
import { useEffect, useState } from 'react'
import MagnifyingGlass from '../../img/magnifying-glass.svg'
import XIcon from '@/app/img/x.svg'
import Search from '../Search'
import { useBottomSheet } from '@/app/providers/bottomSheet'
import { usePathname } from 'next/navigation'

function Header() {
  const [showSearch, setShowSearch] = useState(false)
  const { setPosition } = useBottomSheet()
  const pathname = usePathname()

  useEffect(() => {
    // hide search if we've navigated away from the home page (e.g. to a train detail
    // page)
    if (pathname !== '/') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSearch(false)
    }
  }, [pathname])

  const handleSearchClick = () => {
    if (!showSearch) {
      // will switch to showing search
      setPosition('bottom') // close bottom sheet so search dropdowns aren't blocked
    }
    setShowSearch((prev) => !prev)
  }

  return (
    <header className="absolute top-0 left-0 z-1 min-w-full bg-linear-to-b from-white to-transparent px-3 pt-2 pb-3 text-shadow-2xs text-shadow-white dark:from-black dark:text-white dark:text-shadow-black">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <Link href="/" className="hidden md:block">
            <h1 className="text-xl font-bold">
              Train
              <span className="text-amtrak-blue-500 dark:text-amtrak-blue-300">
                Tracker
              </span>
            </h1>
          </Link>
          <span className="hidden md:block">
            Live tracking North American intercity passenger rail
          </span>
          <button
            className={cn(
              'box-content flex cursor-pointer items-center gap-1 rounded-full border-2 px-3 py-1 font-semibold backdrop-blur-xs md:hidden',
              {
                'bg-amtrak-red-500 border-amtrak-red-500 text-white':
                  showSearch,
              },
            )}
            onClick={handleSearchClick}
          >
            {showSearch ? (
              <>
                <XIcon className="w-4 fill-white" alt="Close" />{' '}
                <span>Close</span>
              </>
            ) : (
              <>
                <MagnifyingGlass className="w-4" /> <span>Find a Train</span>
              </>
            )}
          </button>
        </div>
        <nav className="flex gap-3 font-medium">
          <a href="#">Gear Guide</a>
          <a href="#">About</a>
        </nav>
      </div>
      {showSearch && (
        <Search
          className="mt-1 rounded-md shadow-md text-shadow-none"
          id="header"
        />
      )}
    </header>
  )
}

export default Header
