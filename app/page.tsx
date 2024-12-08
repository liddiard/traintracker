'use client'

import { useSearchParams } from 'next/navigation'
import TrainList from './components/TrainList'
import { useTrains } from './providers/train'

export default function Home({}) {
  const { trains } = useTrains()
  const params = useSearchParams()

  return (
    trains && (
      <TrainList
        trains={trains}
        filters={{
          from: params.get('from'),
          to: params.get('to'),
          trainName: params.get('trainName'),
          trainNumber: params.get('trainNumber'),
        }}
      />
    )
  )
}
