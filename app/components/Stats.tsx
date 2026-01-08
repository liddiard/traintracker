import cn from 'classnames'
import { TimeStatus, Train } from '../types'
import { getTrainMeta, median } from '../utils'
import { classNames } from '../constants'
import { useMemo } from 'react'

function Stats({ trains }: { trains: Train[] }) {
  const trainMetas = useMemo(() => trains.map((t) => getTrainMeta(t)), [trains])

  const numUnderway = trainMetas.filter(
    ({ code }) =>
      code && [TimeStatus.ON_TIME, TimeStatus.DELAYED].includes(code),
  ).length

  const onTimePct =
    trainMetas.filter(({ code }) => code === TimeStatus.ON_TIME).length /
    numUnderway

  const medianDelay = median(
    trainMetas
      .filter(({ code, delay }) => code === TimeStatus.DELAYED && delay)
      .map(({ delay }) => delay) as number[],
  )

  const stats = [
    {
      title: 'Underway',
      value: numUnderway,
    },
    {
      title: 'On Time',
      value: Math.round(onTimePct * 100),
      unit: '%',
    },
    {
      title: 'Median Delay',
      value: Math.round(medianDelay),
      unit: ' min',
    },
  ]
  return (
    <div
      className={cn(
        'mx-3 flex justify-evenly gap-2 border-b py-3 text-center',
        classNames.sectionSeparator,
      )}
    >
      {stats.map(({ title, value, unit }) => (
        <div key={title} className="flex flex-col">
          <div>
            <span className="text-3xl">{value}</span>
            {unit && (
              <span className={cn('text-lg', classNames.textDeemphasized)}>
                {unit}
              </span>
            )}
          </div>
          <div
            className={cn('text-sm font-semibold', classNames.textDeemphasized)}
          >
            {title}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Stats
