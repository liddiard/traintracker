'use client'

import { useSearchParams } from 'next/navigation'
import TrainList from './components/TrainList'
import { useTrains } from './providers/train'
import { getTrainParams } from './utils'
import Stats from './components/Stats'

export default function Home({}) {
  const { trains } = useTrains()
  const params = useSearchParams()
  const trainParams = getTrainParams(params)

  return (
    <>
      {trains && !Object.keys(trainParams).length && <Stats trains={trains} />}
      {trains && <TrainList trains={trains} filters={trainParams} />}
    </>
  )
}
