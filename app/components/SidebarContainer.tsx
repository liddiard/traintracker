'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function SidebarContainer({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div
      ref={ref}
      className="dark:bg-positron-gray-800 relative z-10 hidden overflow-y-auto shadow-lg md:block md:w-1/4 md:max-w-90 md:min-w-75 dark:text-white"
    >
      {children}
    </div>
  )
}
