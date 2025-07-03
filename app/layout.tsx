import type { Metadata } from 'next'

import './globals.css'
import Map from './components/Map'
import Search from './components/Search'
import { formatTrainResponse } from './utils'
import { TrainProvider } from './providers/train'
import { SettingsProvider } from './providers/settings'
import { Station } from './types'
import { inter } from './constants'

export const metadata: Metadata = {
  title: 'TrainTracker',
  description: 'Track your US Amtrak train with a live map and notifications',
}

async function getTrains() {
  try {
    const response = await fetch('http://localhost:3000/api/trains')
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

async function getStations() {
  try {
    const response = await fetch('http://localhost:3000/api/stations')
    if (!response.ok) {
      throw new Error('Failed to fetch stations')
    }
    return Object.values(await response.json()) as Station[]
  } catch (error) {
    console.error('Server-side station data fetch failed:', error)
    return []
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const trains = await getTrains()
  const stations = await getStations()

  return (
    <html lang="en">
      <body className={inter.className}>
        <SettingsProvider>
          <TrainProvider initialTrains={trains} stations={stations}>
            <div className="flex h-screen flex-wrap md:flex-nowrap">
              <div className="relative z-10 h-full w-full overflow-y-auto shadow-lg md:w-1/4 md:min-w-[300px] dark:bg-positron-gray-900 dark:text-white">
                <Search />
                {children}
              </div>
              <div className="relative h-full w-full md:w-3/4">
                <Map />
              </div>
            </div>
          </TrainProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
