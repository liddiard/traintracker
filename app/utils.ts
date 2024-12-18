import {
  Station,
  StationTrainRaw,
  TrainResponse,
  Train,
  TimeStatus,
  TrainStatus,
  Route,
} from './types'

export const createRouteNumMap = (trains: Train[]) =>
  trains.reduce(
    (acc, { routeName, trainNum }) => ({
      ...acc,
      [routeName]: acc.hasOwnProperty(routeName)
        ? acc[routeName].add(trainNum)
        : (acc[routeName] = new Set([trainNum])),
    }),
    {} as Route,
  )

export const createStationList = (trains: Train[]): Station[] =>
  Object.values(
    trains
      .flatMap((t) => t.stations)
      .reduce(
        (acc, { code, name, tz }) => ({
          ...acc,
          [code]: {
            code,
            name,
            tz,
          },
        }),
        {},
      ),
  )

export const formatTrainResponse = (res: TrainResponse) => {
  const trains = Object.values(res).flat()
  return Object.values(trains).map((route) => ({
    ...route,
    createdAt: new Date(route.createdAt),
    updatedAt: new Date(route.updatedAt),
    lastValTS: new Date(route.lastValTS),
    stations: route.stations.map(formatStationResponse),
    // Amtrak trains have object IDs; VIA Rail doesn't
    // VIA Rail has unique train IDs; Amtrak doesn't
    objectID: (route.objectID || route.trainID).toString(),
  }))
}

const formatStationResponse = (station: StationTrainRaw) => ({
  ...station,
  schArr: new Date(station.schArr),
  schDep: new Date(station.schDep),
  arr: station.arr ? new Date(station.arr) : null,
  dep: station.dep ? new Date(station.dep) : null,
})

export const getTrainStatus = (train: Train) => {
  const now = new Date()
  const { stations } = train
  const prevStation = stations.findLast(
    ({ dep }) => dep instanceof Date && dep < now,
  )
  const curStation = stations.find(
    ({ arr, dep }) =>
      arr instanceof Date && dep instanceof Date && arr < now && dep > now,
  )
  const nextStation = stations.find(
    ({ arr }) => !(arr instanceof Date) || arr > now,
  )
  const status: TrainStatus = {
    code: undefined,
    prevStation,
    curStation,
    nextStation,
    deviation: undefined,
    firstStation: stations[0],
    lastStation: stations[stations.length - 1],
  }
  if (!nextStation) {
    status.code = TimeStatus.COMPLETE
    return status
  }
  if (!prevStation && nextStation.code === stations[0].code) {
    status.code = TimeStatus.PREDEPARTURE
    return status
  }
  // else train is underway
  const station = curStation ?? prevStation
  if (!station?.arr) {
    return status // unkonwn status code
  }
  status.deviation = Math.round(
    (station.arr.valueOf() - station.schArr.valueOf()) / 1000 / 60,
  )
  status.code = status.deviation > 0 ? TimeStatus.DELAYED : TimeStatus.ON_TIME
  return status
}

export const findTrainsFromSegment = (
  trains: Train[],
  origCode: string,
  destCode: string,
) =>
  trains.filter(({ stations }) => {
    const origStationIndex = stations.findIndex((s) => s.code === origCode)
    const destCodeIndex = stations.findIndex((s) => s.code === destCode)
    return (
      origStationIndex > -1 &&
      destCodeIndex > -1 &&
      origStationIndex < destCodeIndex
    )
  })

/**
 * Get the offset in minutes between the given timezone and UTC.
 * Source: https://stackoverflow.com/a/68593283
 * @param {string} [timeZone='UTC'] The timezone to calculate the offset for.
 * @param {Date} [date=new Date()] The date to calculate the offset for.
 * @returns {number} The offset in minutes.
 */
export const getOffset = (timeZone = 'UTC', date = new Date()) => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }))
  return (tzDate.getTime() - utcDate.getTime()) / 6e4
}

export const formatTime = (
  date: Date,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    timeZone: tz,
  }
  // include the date if it's not today
  if (new Date().getDate() !== date.getDate()) {
    options.month = 'short'
    options.day = 'numeric'
  }
  return Intl.DateTimeFormat(
    Intl.DateTimeFormat().resolvedOptions().locale,
    options,
  ).format(date)
}
