'use client'

import { useSearchParams } from 'next/navigation'
import TrainList from './components/TrainList'
import { useTrains } from './providers/train'
import { getTrainParams } from './utils'
import Stats from './components/Stats'
import TrainSort from './components/TrainSort'
import { TRAIN_QUERY_PARAMS } from './constants'

export default function Home({}) {
  const { trains } = useTrains()
  const query = useSearchParams()
  const params = getTrainParams(query)
  const hasSearchParams = Object.keys(params).some((p) =>
    TRAIN_QUERY_PARAMS.search.includes(p),
  )

  return (
    <>
      {trains && !hasSearchParams && <Stats trains={trains} />}
      {trains && <TrainSort {...params} />}
      {trains && <TrainList trains={trains} params={params} />}
    </>
  )
}
