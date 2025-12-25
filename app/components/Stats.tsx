import cn from 'classnames'
import { TimeStatus, Train } from '../types'
import { getTrainColor, getTrainMeta, median } from '../utils'
import { classNames } from '../constants'

function Stats({ trains }: { trains: Train[] }) {
  const trainMetas = trains.map((t) => getTrainMeta(t))

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

  const renderGraph = () => (
    <>
      {trainMetas
        .filter(({ code }) => code === TimeStatus.ON_TIME)
        .map((tm) => (
          <div
            key={tm.id}
            className="w-full"
            style={{ backgroundColor: getTrainColor(tm) }}
          />
        ))}
      <div className="w-full bg-white" />
      {trainMetas
        .filter(({ code }) => code === TimeStatus.DELAYED)
        .sort((a, b) => a.delay - b.delay)
        .map((tm) => (
          <div
            key={tm.id}
            className="w-full"
            style={{ backgroundColor: getTrainColor(tm) }}
          />
        ))}
    </>
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
    <>
      {/* <div className="mt-4 flex h-4 w-full overflow-hidden px-3">
        {renderGraph()}
      </div> */}
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
              className={cn(
                'text-sm font-semibold',
                classNames.textDeemphasized,
              )}
            >
              {title}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Stats
