import type { Metadata } from 'next'

import './globals.css'
import Map from './components/Map'
import Search from './components/Search'
import {
  createRouteNumMap,
  createStationList,
  formatTrainResponse,
} from './utils'
import { TrainProvider } from './providers/train'

export const metadata: Metadata = {
  title: 'TrainTracker',
  description: 'Track your US Amtrak train with a live map and notifications',
}

async function getTrains() {
  try {
    const response = await fetch('http://localhost:3000/api/trains', {
      // cache: 'no-store', // Ensure fresh data on each server render
      // next: { revalidate: 0 } // Disable caching
    })

    if (!response.ok) {
      throw new Error('Failed to fetch trains')
    }
    const data = await response.json()
    return formatTrainResponse(data)
  } catch (error) {
    console.error('Server-side train data fetch failed:', error)
    return []
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const trains = await getTrains()

  return (
    <html lang="en">
      <body>
        <TrainProvider initialTrains={trains}>
          <div className="h-screen flex flex-wrap md:flex-nowrap">
            <div className="h-full w-full md:w-1/4 relative overflow-y-auto shadow-lg z-10 md:min-w-[300px]">
              <Search />
              {children}
            </div>
            <div className="h-full w-full md:w-3/4 relative">
              <Map />
            </div>
          </div>
        </TrainProvider>
      </body>
    </html>
  )
}
