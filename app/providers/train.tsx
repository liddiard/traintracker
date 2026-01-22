'use client'

import React, {
  ReactNode,
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from 'react'
import { Station, Train } from '../types'
import { formatTrainResponse } from '../utils'

const TrainContext = createContext<{
  trains: Train[]
  stations: Station[]
  isLoading: boolean
  error: Error | null
}>({
  trains: [],
  stations: [],
  isLoading: false,
  error: null,
})

export const TrainProvider: React.FC<{
  children: ReactNode
  initialTrains: Train[]
  stations: Station[]
}> = ({ children, initialTrains, stations }) => {
  const [trains, setTrains] = useState<Train[]>(initialTrains)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTrains = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/trains')
      if (!response.ok) {
        throw new Error('Failed to fetch trains')
      }
      const data = await response.json()
      const trains = formatTrainResponse(data)
      setTrains(trains)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('An unknown error occurred'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(fetchTrains, 15 * 1000) // 15 seconds
    return () => clearInterval(interval)
  }, [])

  // Memoize context to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ trains, stations, isLoading, error }),
    [trains, stations, isLoading, error],
  )

  return <TrainContext.Provider value={value}>{children}</TrainContext.Provider>
}

export const useTrains = () => {
  const context = useContext(TrainContext)
  if (context === undefined) {
    throw new Error('useTrains must be used within a TrainProvider')
  }
  return context
}
