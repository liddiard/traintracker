import { TimeStatus, Train } from '../types'
import { getTrainColor, getTrainStatus, median } from '../utils'

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

  const renderGraph = () => (
    <>
      {trainStatuses
        .filter(({ code }) => code === TimeStatus.ON_TIME)
        .map((ts) => (
          <div
            key={ts.objectID}
            className="w-full"
            style={{ backgroundColor: getTrainColor(ts) }}
          />
        ))}
      <div className="w-full bg-white" />
      {trainStatuses
        .filter(({ code }) => code === TimeStatus.DELAYED)
        .sort((a, b) => (a.deviation || 0) - (b.deviation || 0))
        .map((ts) => (
          <div
            key={ts.objectID}
            className="w-full"
            style={{ backgroundColor: getTrainColor(ts) }}
          />
        ))}
    </>
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
    <>
      <div className="mt-4 flex h-4 w-full overflow-hidden px-3">
        {renderGraph()}
      </div>
      <div className="mx-3 flex justify-evenly gap-2 border-b border-positron-gray-200 py-3 text-center">
        {stats.map(({ title, value, unit }) => (
          <div key={title} className="flex flex-col">
            <div>
              <span className="text-3xl">{value}</span>
              {unit && (
                <span className="text-lg text-positron-gray-600">{unit}</span>
              )}
            </div>
            <div className="text-sm font-semibold text-positron-gray-600">
              {title}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Stats
