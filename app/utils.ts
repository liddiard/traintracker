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
import { TRAIN_SEARCH_PARAMS } from './constants'

// convert a whole number of milliseconds to seconds
export const msToMins = (ms: number) => ms / 1000 / 60

/**
 * Finds the median of an array of numbers.
 *
 * If the array has an even length, the median is the average of the two middle numbers.
 * If the array has an odd length, the median is the middle number.
 *
 * @param numbers - The input numbers
 * @returns The median of the input numbers
 */
export const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Extracts and returns train-related parameters from the given URLSearchParams.
 *
 * Filters entries in the URLSearchParams object to only include keys defined
 * in `TRAIN_SEARCH_PARAMS` and have a non-empty value. These entries are
 * converted into an object with key-value pairs.
 *
 * @param params - The URLSearchParams object containing the search parameters.
 * @returns An object containing filtered train-related parameters.
 */
export const getTrainParams = (params: URLSearchParams) =>
  Object.fromEntries(
    params
      .entries()
      .filter(([key, val]) => TRAIN_SEARCH_PARAMS.includes(key) && val),
  )

// return departure and arrival time of a train using actual departure/arrival
// if available, else scheduled arrival/departure
export const getDeparture = ({ dep, schDep }: StationTrain) => dep || schDep
export const getArrival = ({ arr, schArr }: StationTrain) => arr || schArr

/**
 * Creates a map of route names (e.g. "Acela", "Empire Builder") to sets of
 * train numbers, given an array of trains.
 *
 * Useful for looking up the train numbers for a given route.
 *
 * @param trains - The array of trains to create the map from
 * @returns A map of route names to sets of train numbers
 */
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

/**
 * Creates an array of station objects from an array of trains.
 *
 * Given an array of trains, returns an array with all involved stations.
 * Each station object has the following properties:
 * - `code`: The station code (e.g. 'BOS')
 * - `name`: The station name (e.g. 'Boston South Station')
 * - `tz`: The timezone of the station (e.g. 'America/New_York')
 *
 * @param trains - The array of trains to create the station list from
 * @returns An array of unique station objects
 */
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

/**
 * Formats the raw train API response by converting date strings to Date
 * objects and normalizes IDs to ensure that each train has a string
 * `objectID`.
 *
 * @param res - The raw train response data to format.
 * @returns An array of formatted train data with Date objects and proper objectID.
 */
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

/**
 * Given a train object, determines the current status of the train.
 *
 * Returned object has the following properties:
 * - `code`: The status code of the train (TimeStatus enum)
 * - `prevStation`: The previous station of the train (StationTrain)
 * - `curStation`: The current station of the train (StationTrain)
 * - `nextStation`: The next station of the train (StationTrain)
 * - `deviation`: The number of minutes the train is currently delayed
 * - `firstStation`: The first station of the train (StationTrain)
 * - `lastStation`: The last station of the train (StationTrain)
 *
 * Logic for determining the status code:
 * - If there is no next station, the status code is TimeStatus.COMPLETE
 * - If there is no previous station and the next station is the first station,
 *   the status code is TimeStatus.PREDEPARTURE
 * - If there is a current or previous station, the status code is determined
 *   by the deviation of the station's arrival time from its scheduled
 *   arrival time.
 *   - If deviation is positive, the status code is TimeStatus.DELAYED
 *   - If deviation is 0 or negative, the status code is TimeStatus.ON_TIME
 * - If there is no current station, the status code is undefined
 *
 * @param train - The train to determine the status of
 * @returns The status of the train
 */
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

/**
 * Given an array of trains, returns an array of trains that travel from
 * the station with `origCode` to the station with `destCode`.
 *
 * @param trains - The array of trains to search
 * @param origCode - Three-letter code of origin station (e.g. "NYP")
 * @param destCode - Three-letter code of destination station (e.g. "WAS")
 * @returns An array of trains that travel from `origCode` to `destCode`
 */
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

/**
 * Format a given date as a string in the given timezone.
 *
 * The string is formatted as "HH:MM p" (e.g. "12:30 p")
 *
 * @param date - The date to format
 * @param tz - The timezone to format the date in (defaults to the
 *             user's current timezone)
 * @returns A string representation of the formatted date
 */
export const formatTime = (
  date: Date,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
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

/**
 * Format a given date as a string in the given timezone.
 *
 * The string is formatted as "Month(short) Day" (e.g. "May 5")
 *
 * @param date - The date to format
 * @param tz - The timezone to format the date in (defaults to the
 *             user's current timezone)
 * @returns A string representation of the formatted date
 */
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

/**
 * Format a duration in minutes as a string.
 *
 * If the duration is less than 60 minutes, it is formatted as "<minutes> <minutesString>"
 * where <minutesString> is 'minute', 'minutes', or 'min' depending on the value of
 * <minutes> and the value of the shortenMins option.
 *
 * If the duration is greater than or equal to 60 minutes, it is formatted as
 * "<hours>h <minutes>m".
 *
 * If the duration is zero, it is formatted as "now".
 *
 * @param minutes - The duration in minutes
 * @param options - An object with an optional property `shortenMins` that causes the
 *                  minutes string to be shortened from 'minutes' to 'min' if true.
 * @returns A string representation of the formatted duration
 */
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
  } else if (minutes === 0) {
    return 'now'
  } else {
    minsString = 'minutes'
  }
  return minutes < 60
    ? `${minutes} ${minsString}`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/**
 * Check if two dates are on different days, given their respective timezones.
 *
 * If `b` is not provided, the current date is used.
 * If `tzB` is not provided, the user's current timezone is used.
 *
 * @param a - The first date
 * @param b - The second date (optional)
 * @param tzA - The timezone of the first date
 * @param tzB - The timezone of the second date (optional)
 * @returns Whether the two dates are in different days
 */
export const dayDiffers = (
  a: Date,
  b: Date = new Date(),
  tzA: string,
  tzB: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => formatDate(a, tzA) !== formatDate(b, tzB)

/**
 * Calculates the progress of a train's current segment.
 *
 * The progress is an object with the following properties:
 * - `minsToDeparture`: Number of minutes until the train departs from the
 *   previous station.
 * - `minsToArrival`: Number of minutes until the train arrives at the
 *   next station.
 * - `percent`: Percentage of progress that has been made on the current
 *   segment, expressed as a value between 0 and 1.
 *
 * If the train is at a station, `minsToDeparture` is non-zero and `percent` is
 * 0. If the train is enroute between stations, `minsToArrival` is non-zero and
 * `percent` is a value between 0 and 1.
 *
 * @param trainStatus - The status of the train
 * @returns The progress of the train's current segment
 */
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
    progress.minsToDeparture = msToMins(departureTime - Date.now())
    progress.percent = 0 // no progress has been made on "current" (upcoming) segment
  } else if (departureTime && !curStation && nextStation) {
    // train is enroute between stations
    const arrivalTime =
      nextStation.arr?.valueOf() ?? nextStation.schArr.valueOf()
    const minsToArrival = msToMins(arrivalTime - Date.now())
    const minsBetweenStations = msToMins(arrivalTime - departureTime)
    const minsElapsed = minsBetweenStations - minsToArrival
    progress.minsToArrival = minsToArrival
    progress.percent = minsElapsed / minsBetweenStations
  }
  return progress
}

/**
 * Given an array of stations, a comparison function, and an initial value,
 * returns the minimum or maximum segment duration (in minutes) between the
 * scheduled arrival times of consecutive stations.
 *
 * @param stations - An array of stations
 * @param compareFunc - A function that compares two numbers and returns a new
 *   value. This function should behave like `Math.max` or `Math.min`.
 * @param initialValue - The initial value to pass to the comparison function
 *   (defaults to 0)
 * @returns The minimum or maximum segment duration in minutes
 */
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

/**
 * Given a delay in minutes, returns a color string representing the delay.
 *
 * The colors range from yellow-orange to bright red as the delay
 * increases, up to 2 hours.
 *
 * @param delay - The delay in minutes
 * @returns A color string representing the delay
 */
export const getDelayColor = (delay: number) => {
  const delayPalette = interpolate(['#ab7a00', '#ab4c00', '#ab1e00', '#ff4018'])
  const maxDelay = 60 * 2 // minutes
  return delay
    ? delayPalette(Math.min(delay, maxDelay) / maxDelay)
    : delayPalette(0)
}
