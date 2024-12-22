import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import Map from './components/Map'
import Search from './components/Search'
import { formatTrainResponse } from './utils'
import { TrainProvider } from './providers/train'

export const metadata: Metadata = {
  title: 'TrainTracker',
  description: 'Track your US Amtrak train with a live map and notifications',
}

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <TrainProvider initialTrains={trains}>
          <div className="flex h-screen flex-wrap md:flex-nowrap">
            <div className="relative z-10 h-full w-full overflow-y-auto shadow-lg md:w-1/4 md:min-w-[300px]">
              <Search />
              {children}
            </div>
            <div className="relative h-full w-full md:w-3/4">
              <Map />
            </div>
          </div>
        </TrainProvider>
      </body>
    </html>
  )
}
