import { interpolate, formatRgb, average } from 'culori'
import {
  TrainResponse,
  Train,
  TimeStatus,
  Route,
  Stop,
  Station,
  StopResponseItem,
  TrainMeta,
  TimeFormat,
  TrainQueryParams,
} from './types'
import { TRAIN_QUERY_PARAMS } from './constants'
import { routeToCodeMap } from './components/Map/constants'

// convert a whole number of milliseconds to seconds
export const msToMins = (ms: number) => ms / 1000 / 60

// convert miles per hour to kilometers per hour
export const mphToKmh = (mph: number) => mph * 1.609344

// convert kilometers per hour to miles per hour
export const kmhToMph = (kmh: number) => kmh / 1.609344

// sleep for given `ms`, suitable for use in async functions
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Reverses (mirrors) an object's keys and values
 *
 * @param obj Object for which to reverse keys
 * @returns Object with keys as values, and values as keys
 *
 * @example
 * // returns { a: 1, b: 2 }
 * keyMirror({ 1: a, 2: b })
 */
export const keyMirror = (obj: Object) =>
  Object.fromEntries(Object.entries(obj).map(([key, val]) => [val, key]))

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
 * Creates a cached version of a function where cache validity is determined by a custom condition.
 *
 * @param fn - The original function to cache
 * @param getKey - Function that generates a cache key from the arguments
 * @param isValidCache - Function that determines if a cached value is still valid
 * @returns A wrapped function that uses caching
 */
export const createCachedFunction = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  getKey: (...args: Args) => string,
  isValidCache: (cachedValue: Result, ...args: Args) => boolean,
): ((...args: Args) => Result) => {
  const cache: Record<string, Result> = {}
  return (...args: Args): Result => {
    const key = getKey(...args)
    const cachedValue = cache[key]

    if (cache.hasOwnProperty(key) && isValidCache(cachedValue, ...args)) {
      return cachedValue
    }

    const result = fn(...args)
    cache[key] = result
    return result
  }
}

/**
 * Extracts and returns train-related query params from the given URLSearchParams.
 *
 * Filters entries in the URLSearchParams object to only include keys defined
 * in `TRAIN_QUERY_PARAMS` that have a non-empty value. These entries are converted
 * into an object with key-value pairs.
 *
 * @param params - The URLSearchParams object containing the search parameters.
 * @returns An object containing filtered train-related parameters.
 */
export const getTrainParams = (params: URLSearchParams): TrainQueryParams =>
  Object.fromEntries(
    params
      .entries()
      .filter(
        ([key, val]) =>
          Object.values(TRAIN_QUERY_PARAMS).flat().includes(key) && val,
      ),
  )

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
    (acc, { name, number }) => ({
      ...acc,
      [name]: acc.hasOwnProperty(name)
        ? acc[name].add(number)
        : (acc[name] = new Set([number])),
    }),
    {} as Route,
  )

/**
 * Formats the raw train API response by converting date strings to Date
 * objects.
 *
 * @param res - The raw train response data to format.
 * @returns An array of formatted train data with Date objects.
 */
export const formatTrainResponse = (res: TrainResponse): Train[] =>
  res.map((train) => ({
    ...train,
    updated: train.updated ? new Date(train.updated) : null,
    stops: train.stops.map(formatStopResponse),
  }))

const formatStopResponse = (stop: StopResponseItem): Stop => ({
  ...stop,
  arrival: {
    ...stop.arrival,
    time: new Date(stop.arrival.time),
  },
  departure: {
    ...stop.departure,
    time: new Date(stop.departure.time),
  },
})

/**
 * Given a train object, determines the current status of the train.
 *
 * Returned object has the following properties:
 * - `code`: The status code of the train (TimeStatus enum)
 * - `prevStop`: The previous station of the train (StationTrain)
 * - `curStop`: The current station of the train (StationTrain)
 * - `nextStop`: The next station of the train (StationTrain)
 * - `deviation`: The number of minutes the train is currently delayed
 * - `firstStop`: The first station of the train (StationTrain)
 * - `lastStop`: The last station of the train (StationTrain)
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
export const getTrainMeta = (train: Train): TrainMeta => {
  const now = new Date()
  const { stops, id, updated } = train
  const prevStop = stops.findLast(
    ({ departure: { time } }) => time instanceof Date && time < now,
  )
  const curStop = stops.find(
    ({ arrival, departure }) =>
      arrival.time instanceof Date &&
      departure.time instanceof Date &&
      arrival.time < now &&
      departure.time > now,
  )
  const nextStop = stops.find(
    ({ arrival: { time } }) => time instanceof Date && time > now,
  )
  const meta: TrainMeta = {
    id,
    code: undefined,
    updated,
    delay: 0,
    prevStop,
    curStop,
    nextStop,
    firstStop: stops[0],
    lastStop: stops[stops.length - 1],
  }
  if (!nextStop) {
    meta.code = TimeStatus.COMPLETE
    return meta
  }
  if (!prevStop && nextStop.code === stops[0].code) {
    meta.code = TimeStatus.PREDEPARTURE
    return meta
  }
  // else train is underway
  const stop = curStop ?? nextStop
  if (!stop?.arrival.time) {
    return meta // unknown status code
  }
  meta.delay = stop.arrival.delay

  // determine if train should be marked as delayed
  const isLongHaul =
    new Date(meta.lastStop.arrival.time).getTime() -
      new Date(meta.firstStop.departure.time).getTime() >
    43200 * 1000 // 12 hours
  const delayThreshold = isLongHaul ? 10 : 5 // minutes
  meta.code =
    meta.delay > delayThreshold ? TimeStatus.DELAYED : TimeStatus.ON_TIME
  return meta
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
  trains.filter(({ stops }) => {
    const origStationIndex = stops.findIndex((s) => s.code === origCode)
    const destCodeIndex = stops.findIndex((s) => s.code === destCode)
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

interface FormatTimeOptions {
  tz?: string
  timeFormat?: TimeFormat
  seconds?: boolean
}

/**
 * Format a given date as a string in the given timezone.
 *
 * The string is formatted as "HH:MM p" (e.g. "1:30 p") in 12-hour format or "HH:MM"
 * in 24-hour format (e.g. "13:30"). If seconds is true, the format includes
 * seconds (e.g. "1:30:45 p" or "13:30:45").
 *
 * @param date - The date to format
 * @param options - The options object
 * @param options.tz - The timezone to format the date in (defaults to the user's current timezone)
 * @param options.timeFormat - Whether to use 12-hour or 24-hour format (defaults to 'hr12')
 * @param options.seconds - Whether to include seconds in the output (defaults to false)
 * @returns A string representation of the formatted date
 */
export const formatTime = (
  date: Date,
  { tz, timeFormat = 'hr12', seconds = false }: FormatTimeOptions,
) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    ...(seconds ? { second: 'numeric' } : {}),
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour12: timeFormat === 'hr12',
  }
  const parts = Intl.DateTimeFormat(
    Intl.DateTimeFormat().resolvedOptions().locale,
    options,
  ).formatToParts(date)

  return parts
    .reduce((acc, { type, value }) => {
      if (type === 'dayPeriod') {
        // replace "am"/"pm" with "a"/"p"
        return acc + value.toLowerCase().slice(0, 1)
      }
      return acc + value
    }, '')
    .replace(/\s+/g, ' ')
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
  let pastString = ''
  if (minutes < 0) {
    pastString = ' ago'
  }
  minutes = Math.abs(minutes)
  let minsString
  if (shortenMins) {
    minsString = 'min'
  } else if (minutes === 1) {
    minsString = 'minute'
  } else {
    minsString = 'minutes'
  }
  return minutes < 60
    ? `${minutes} ${minsString}${pastString}`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m${pastString}`
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
 * Calculates the scheduled time of a train stop by subtracting the delay from
 * the estimated/actual time.
 *
 * @param time - The estimated or actual time of the train stop
 * @param delay - The delay in minutes
 * @returns
 */
export const getScheduledTime = ({
  time,
  delay,
}: {
  time: Date | null
  delay: number
}) => time && new Date(time.getTime() - delay * 60 * 1000)

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
 * @param trainMeta - The status of the train
 * @returns The progress of the train's current segment
 */
export const getCurrentSegmentProgress = (trainMeta: TrainMeta) => {
  const { prevStop, curStop, nextStop } = trainMeta
  const progress = {
    minsToDeparture: 0,
    minsToArrival: 0,
    percent: 0,
  }
  const departureTime = prevStop?.arrival.time.valueOf()
  const arrivalTime = nextStop?.arrival.time.valueOf()

  if (curStop?.departure.time && nextStop && departureTime) {
    // train is at a station
    progress.minsToDeparture = msToMins(
      curStop.departure.time.valueOf() - Date.now(),
    )
    progress.percent = 0 // no progress has been made on "current" (upcoming) segment
  } else if (!curStop && arrivalTime && departureTime) {
    // train is enroute between stations
    const minsToArrival = msToMins(arrivalTime - Date.now())
    const minsBetweenStations = msToMins(arrivalTime - departureTime)
    const minsElapsed = minsBetweenStations - minsToArrival
    progress.minsToArrival = minsToArrival
    progress.percent = minsElapsed / minsBetweenStations
  }
  return progress
}

/**
 * Given an array of stops, a comparison function, and an initial value,
 * returns the minimum or maximum segment duration (in minutes) between the
 * scheduled arrival times of consecutive stops.
 *
 * @param stops - An array of stops
 * @param compareFunc - A function that compares two numbers and returns a new
 *   value. This function should behave like `Math.max` or `Math.min`.
 * @param initialValue - The initial value to pass to the comparison function
 *   (defaults to 0)
 * @returns The minimum or maximum segment duration in minutes
 */
export const getSegmentDurationMinMax = (
  stops: Stop[],
  compareFunc: (a: number, b: number) => number,
  initialValue = 0,
) =>
  stops.reduce((acc, { arrival }, idx, stations) => {
    const prevStopArr = stations[idx - 1]?.arrival
    const prevStopArrScheduled = prevStopArr && getScheduledTime(prevStopArr)
    const nextStopArrScheduled = getScheduledTime(arrival)
    return prevStopArrScheduled && nextStopArrScheduled
      ? compareFunc(
          acc,
          msToMins(
            nextStopArrScheduled.valueOf() - prevStopArrScheduled.valueOf(),
          ),
        )
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
  const delayPalette = interpolate([
    getCSSVar('--color-amtrak-yellow-400'),
    average([
      getCSSVar('--color-amtrak-yellow-400'),
      getCSSVar('--color-amtrak-red-600'),
    ]),
    getCSSVar('--color-amtrak-red-600'),
    getCSSVar('--color-amtrak-red-400'),
  ])
  const maxDelay = 60 * 2 // minutes
  const color = delay
    ? delayPalette(Math.min(delay, maxDelay) / maxDelay)
    : delayPalette(0)
  return formatRgb(color)
}

/**
 * Given a train status, returns a color representing it.
 *
 * @param trainMeta - The status of the train
 * @returns A color string representing the train's status
 */
export const getTrainColor = (trainMeta: TrainMeta) => {
  const { code, delay } = trainMeta
  if (code === undefined) {
    return getCSSVar('--color-positron-gray-600')
  }
  return {
    [TimeStatus.PREDEPARTURE]: formatRgb(getCSSVar('--color-amtrak-blue-500')),
    [TimeStatus.ON_TIME]: formatRgb(getCSSVar('--color-amtrak-green-400')),
    [TimeStatus.DELAYED]: getDelayColor(delay),
    [TimeStatus.COMPLETE]: formatRgb(getCSSVar('--color-amtrak-deep-blue')),
  }[code]
}

/**
 * Generates a short code identifier for a train by combining the route code and train number.
 *
 * @param {TrainFeatureProperties} train - The train feature object containing route name and train number
 * @returns {string} A formatted shortcode combining the route code and train number (e.g. "NE 123")
 *
 * @example
 * // Returns "NE 123"
 * getTrainShortcode({ routeName: "Northeast Regional", trainNum: "123" })
 *
 * @example
 * // Returns "456" (if no mapping exists for "Unknown route")
 * getTrainShortcode({ routeName: "Unknown route", trainNum: "456" })
 */
export const getTrainShortcode = ({ name, number }: Train) =>
  [routeToCodeMap[name], number].filter(Boolean).join(' ')

/**
 * Gets the coordinates for a station by its code.
 * @param {string} code The station code.
 * @param {Station[]} stations The list of stations to search.
 * @returns {number[] | undefined} The station's [lat, lon] coordinates, or undefined if not found.
 */
export const getStopCoordinates = (code: string, stations: Station[]) =>
  stations.find((s) => s.code === code)?.coordinates ?? null

/**
 * Converts a numeric heading in degrees into a compass direction, on an 8-point
 * compass rose.
 *
 * @param {number} degrees - Heading in degrees, where 0 (or 360) is North.
 *   Values outside the 0–360 range are normalized.
 * @returns {string} The corresponding compass direction.
 */
export const headingToDirection = (heading: number) => {
  // Normalize to 0–360
  const normalized = ((heading % 360) + 360) % 360
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  // Each direction covers 45°, offset by half a segment (22.5°)
  const index = Math.floor((normalized + 22.5) / 45) % 8
  return directions[index]
}

/**
 * Decodes a URL-safe base64 string into a Uint8Array.
 *
 * @param base64String The URL-safe base64 string to decode.
 * @returns The decoded Uint8Array.
 */
export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Gets the value of a CSS variable (custom property)
 * https://tailwindcss.com/docs/theme#referencing-in-javascript
 *
 * @param color Full CSS property name, including `--` prefix
 * @returns CSS property value as a string
 */
export const getCSSVar = (name: string) =>
  typeof window === 'undefined'
    ? 'white'
    : /* Note: It is critical that callers of this function specify the full property
         value string as an argument, otherwise Tailwind's static analysis will not
         detect the variable as used, and it will strip it from the client stylesheet.
         That's why we don't prefix the property value in this function with like
         `--color-`. Annoying "magic" that I wasted an hour figuring out? You bet.
       */
      getComputedStyle(document.documentElement).getPropertyValue(name)
