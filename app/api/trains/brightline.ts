import GtfsRealtimeBindings, { transit_realtime } from 'gtfs-realtime-bindings'
import { distance, point } from '@turf/turf'
import { stations } from '../stations/route'

// Source: http://feed.gobrightline.com/
const API_ENDPOINTS = {
  POSITIONS: 'http://feed.gobrightline.com/position_updates.pb',
  TRIPS: 'http://feed.gobrightline.com/trip_updates.pb',
}

const fetchPositions = async () => {
  const response = await fetch(API_ENDPOINTS.POSITIONS)
  const buffer = await response.arrayBuffer()
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer),
  )
  return feed.entity
}

const fetchTrips = async () => {
  const response = await fetch(API_ENDPOINTS.TRIPS)
  const buffer = await response.arrayBuffer()
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer),
  )
  return feed.entity
}

const parseTrainNumber = (tripId: string): string => {
  // Example tripId: "5333_BL_36_1"
  const parts = tripId.split('_')
  return parts[0] // "5333"
}

const processStation = ({
  stopId,
  arrival,
  departure,
}: transit_realtime.TripUpdate.IStopTimeUpdate): StopResponse => ({
  code: stopId!,
  name: stations[`brightline/${stopId}`]?.name || stopId!,
  timezone: 'America/New_York', // all current Brightline stations are in US Eastern Time
  arrival: {
    time: arrival?.time ? new Date((arrival.time as number) * 1000) : null,
    delay: arrival?.delay || 0,
  },
  departure: {
    time: departure?.time ? new Date((departure.time as number) * 1000) : null,
    delay: departure?.delay || 0,
  },
})

/**
 * Finds the index of the next scheduled stop based on current time.
 *
 * @param stops - Array of train stops with arrival time information
 * @returns The index of the next stop, or -1 if no upcoming stops exist
 */
const getNextStopIndex = (stops: StopResponse[]): number => {
  const now = new Date()
  return stops.findIndex((stop) => {
    const arrivalTime = stop.arrival.time
    return arrivalTime && arrivalTime > now
  })
}

/**
 * Determines the current status of a train based on its stop schedule.
 *
 * @param stops - Array of train stops with arrival time information
 * @returns 'Completed' if the train has finished its route, 'Predeparture' if
 *          the train hasn't departed yet, or 'Active' if the train is en route
 */
const determineTrainStatus = (stops: StopResponse[]): TrainStatus => {
  const nextStopIndex = getNextStopIndex(stops)

  // No next stop means train has completed its journey
  if (nextStopIndex === -1) {
    return 'Completed'
  }

  // Next stop is the first stop means train hasn't departed yet
  if (nextStopIndex === 0) {
    return 'Predeparture'
  }

  // Train is between stations
  return 'Active'
}

/**
 * Calculates the estimated speed of a train based on its position and scheduled arrival.
 *
 * Uses Turf.js to calculate the distance between the train's current position and
 * the next station, then divides by the time remaining until scheduled arrival.
 *
 * @param trainCoordinates - Current GPS coordinates of the train as [longitude, latitude]
 * @param stops - Array of train stops with arrival time information
 * @returns The estimated speed in km/h, or null if speed cannot be calculated
 */
const calculateSpeed = (
  trainCoordinates: [number, number] | null,
  stops: StopResponse[],
): number | null => {
  if (!trainCoordinates) {
    // unknown train position
    return null
  }

  const nextStopIndex = getNextStopIndex(stops)
  if (nextStopIndex === -1) {
    // train has completed its journey
    return 0
  }

  const nextStop = stops[nextStopIndex]
  const nextStopCoordinates =
    stations[`brightline/${nextStop.code}`]?.coordinates

  if (!nextStopCoordinates || !nextStop.arrival.time) {
    // unknown next stop ifno
    return null
  }

  // Calculate distance in kilometers using Turf.js
  const trainPoint = point(trainCoordinates)
  const stationPoint = point(nextStopCoordinates)
  const distanceKm = distance(trainPoint, stationPoint)

  // Calculate time remaining in hours
  const now = new Date()
  const timeRemainingMs = nextStop.arrival.time.getTime() - now.getTime()
  const timeRemainingHours = timeRemainingMs / (1000 * 60 * 60)

  // Avoid division by zero and negative times
  if (timeRemainingHours <= 0) {
    // unexpected negative time remaining to next stop
    return null
  }

  // Calculate speed in km/h
  const speed = distanceKm / timeRemainingHours
  return Math.round(speed)
}

const processTrain = (
  train: transit_realtime.IFeedEntity,
  trip: transit_realtime.IFeedEntity | undefined,
): TrainResponse | null => {
  if (!train.vehicle?.trip?.tripId) {
    return null
  }
  const trainNumber = parseTrainNumber(train.vehicle.trip.tripId)
  const { timestamp, position } = train.vehicle
  const { longitude, latitude } = position || {}
  const stops = (trip?.tripUpdate?.stopTimeUpdate || []).map(processStation)
  const coordinates: [number, number] | null =
    longitude && latitude ? [longitude, latitude] : null

  const status = determineTrainStatus(stops)
  const speed = calculateSpeed(coordinates, stops)

  return {
    id: train.id,
    name: `Brightline ${trainNumber}`,
    number: trainNumber,
    updated: timestamp ? new Date((timestamp as number) * 1000) : null,
    status,
    alerts: [],
    coordinates,
    speed,
    heading: position?.bearing ? position.bearing : null,
    stations: stops,
  }
}

const get = async () => {
  try {
    // train positions
    const positions = await fetchPositions()
    const trips = await fetchTrips()
    const trains = positions
      .map((position) => {
        const trip = trips.find(
          (t) => t.tripUpdate?.trip.tripId === position.vehicle?.trip?.tripId,
        )
        return processTrain(position, trip)
      })
      .filter((train) => train !== null)
    return trains
  } catch (error) {
    console.error('Error fetching Brightline data:', error)
    throw error
  }
}

export default get
