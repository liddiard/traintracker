'use client'

import { useSearchParams } from 'next/navigation'
import TrainList from '@/app/components/TrainList'
import { useTrains } from '@/app/providers/train'
import { getTrainParams } from '@/app/utils'
import Stats from '@/app/components/Stats'
import TrainSort from '@/app/components/TrainSort'
import { TRAIN_QUERY_PARAMS } from '@/app/constants'

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
