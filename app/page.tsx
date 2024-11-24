'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

import Map from './components/Map'
import Search from './components/Search'
import TrainList from './components/TrainList'
import { formatTrainResponse } from './utils'
import { TrainRoute } from './types'

export default function Home() {
  const [trains, setTrains] = useState<TrainRoute[]>()

  useEffect(() => {
    fetchTrains()
    const intervalId = setInterval(fetchTrains, 15 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const fetchTrains = async () => {
    try {
      const response = await fetch('http://localhost:3001/v3/trains').then(
        (res) => res.json(),
      )
      const trains = formatTrainResponse(response)
      setTrains(trains)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="h-screen flex flex-wrap">
      <div className="h-full w-full lg:w-1/4 relative">
        <Search />
        <TrainList trains={trains} />
      </div>
      <div className="h-full w-full lg:w-3/4 relative">
        <Map />
      </div>
    </div>
  )
}
