import { TimeStatus, Train } from '../types'
import { getTrainStatus, median } from '../utils'

function Stats({ trains }: { trains: Train[] }) {
  const trainStatuses = trains.map((t) => getTrainStatus(t))

  const numUnderway = trainStatuses.filter(
    ({ code }) =>
      code && [TimeStatus.ON_TIME, TimeStatus.DELAYED].includes(code),
  ).length

  const onTimePct =
    trainStatuses.filter(({ code }) => code === TimeStatus.ON_TIME).length /
    numUnderway

  const medianDelay = median(
    trainStatuses
      .filter(({ code, deviation }) => code === TimeStatus.DELAYED && deviation)
      .map(({ deviation }) => deviation) as number[],
  )

  const stats = [
    {
      title: 'Active Trains',
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
    <div className="flex gap-2 px-3 py-2 text-center w-full justify-between">
      {stats.map(({ title, value, unit }) => (
        <div key={title} className="flex flex-col">
          <div>
            <span className="text-3xl">{value}</span>
            {unit && (
              <span className="text-positron-gray-600 text-lg">{unit}</span>
            )}
          </div>
          <div className="font-semibold text-positron-gray-600 text-sm">
            {title}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Stats
