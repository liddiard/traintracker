import interpolate from 'color-interpolate'
import {
  Station,
  StationTrainRaw,
  TrainResponse,
  Train,
  TimeStatus,
  TrainStatus,
  Route,
  StationTrain,
} from './types'

export const msToMins = (ms: number) => ms / 1000 / 60

export const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

export const getTrainParams = (params: URLSearchParams) => {
  const trainParams = ['from', 'to', 'trainName', 'trainNumber']
  return Object.fromEntries(
    params.entries().filter(([key, val]) => trainParams.includes(key) && val),
  )
}

export const getDeparture = ({ dep, schDep }: StationTrain) => dep || schDep
export const getArrival = ({ arr, schArr }: StationTrain) => arr || schArr

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
    ({ arr }) => arr instanceof Date && arr > now,
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
  status.deviation = msToMins(station.arr.valueOf() - station.schArr.valueOf())
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
  // includeDayPeriod = true,
) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    timeZone: tz,
  }
  const parts = Intl.DateTimeFormat(
    Intl.DateTimeFormat().resolvedOptions().locale,
    options,
  ).formatToParts(date)

  return parts
    .reduce((acc, { type, value }) => {
      if (type === 'dayPeriod') {
        return acc + value.toLowerCase().slice(0, 1)
      }
      return acc + value
    }, '')
    .replace(/\s+/g, ' ')
}

export const formatDate = (
  date: Date,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }
  return Intl.DateTimeFormat(
    Intl.DateTimeFormat().resolvedOptions().locale,
    options,
  ).format(date)
}

export const formatDuration = (
  minutes: number,
  options?: { shortenMins?: boolean },
) => {
  const { shortenMins = false } = options || {}
  minutes = Math.round(minutes)
  let minsString
  if (shortenMins) {
    minsString = 'min'
  } else if (minutes === 1) {
    minsString = 'minute'
  } else {
    minsString = 'minutes'
  }
  return minutes < 60
    ? `${minutes} ${minsString}`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const dayDiffers = (
  a: Date,
  b: Date = new Date(),
  tzA: string,
  tzB: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => formatDate(a, tzA) !== formatDate(b, tzB)

export const getCurrentSegmentProgress = (trainStatus: TrainStatus) => {
  const { prevStation, curStation, nextStation } = trainStatus
  const progress = {
    minsToDeparture: 0,
    minsToArrival: 0,
    percent: 0,
  }
  const departureTime =
    prevStation?.dep?.valueOf() ?? prevStation?.schDep.valueOf()

  if (curStation && nextStation && departureTime) {
    // train is at a station
    progress.minsToDeparture = msToMins(departureTime - Date.now().valueOf())
    progress.percent = 0 // no progress has been made on "current" (upcoming) segment
  } else if (departureTime && !curStation && nextStation) {
    // train is enroute between stations
    const arrivalTime =
      nextStation.arr?.valueOf() ?? nextStation.schArr.valueOf()
    const minsToArrival = msToMins(arrivalTime - Date.now().valueOf())
    const minsBetweenStations = msToMins(arrivalTime - departureTime)
    const minsElapsed = minsBetweenStations - minsToArrival
    progress.minsToArrival = minsToArrival
    progress.percent = minsElapsed / minsBetweenStations
  }
  return progress
}

export const getSegmentDurationMinMax = (
  stations: StationTrain[],
  compareFunc: (a: number, b: number) => number,
  initialValue = 0,
) =>
  stations.reduce((acc, { schArr }, idx, stations) => {
    const prevStationArr = stations[idx - 1]?.schArr
    return prevStationArr && schArr
      ? compareFunc(acc, msToMins(schArr.valueOf() - prevStationArr.valueOf()))
      : acc
  }, initialValue)

export const getDelayColor = (delay: number) => {
  const delayPalette = interpolate(['#ab7a00', '#ab4c00', '#ab1e00', '#ff4018'])
  const maxDelay = 60 * 2 // minutes
  return delay
    ? delayPalette(Math.min(delay, maxDelay) / maxDelay)
    : delayPalette(0)
}
