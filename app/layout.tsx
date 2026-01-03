import type { Metadata } from 'next'

import './globals.css'
import './app.css'
import Map from './components/Map'
import Search from './components/Search'
import BottomSheet from './components/BottomSheet'
import { formatTrainResponse } from './utils'
import { getServerSettings } from './settings'
import { TrainProvider } from './providers/train'
import { SettingsProvider } from './providers/settings'
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration'
import { Station } from './types'
import { inter } from './constants'
import { BottomSheetProvider } from './providers/bottomSheet'

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
  const settings = await getServerSettings()

  return (
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <SettingsProvider initialSettings={settings}>
          <TrainProvider initialTrains={trains} stations={stations}>
            <BottomSheetProvider>
              <div className="flex h-screen flex-nowrap">
                {/* Desktop sidebar - visible at md and above */}
                <div className="dark:bg-positron-gray-800 relative z-10 hidden overflow-y-auto shadow-lg md:block md:w-1/4 md:min-w-[300px] dark:text-white">
                  <Search id="sidebar" />
                  {children}
                </div>
                <div className="relative h-full w-full md:w-3/4">
                  <Map />
                </div>
              </div>
              {/* Mobile layout with bottom sheet - visible below md */}
              <BottomSheet>{children}</BottomSheet>
            </BottomSheetProvider>
          </TrainProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
