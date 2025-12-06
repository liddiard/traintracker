import GtfsRealtimeBindings, { transit_realtime } from 'gtfs-realtime-bindings'

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
  code: stopId || '',
  name: stopId || '', // TODO: map stopId to station name
  timezone: 'America/New_York', // TODO: map stopId to timezone
  arrival: {
    time: arrival?.time ? new Date((arrival.time as number) * 1000) : null,
    delay: arrival?.delay || 0,
  },
  departure: {
    time: departure?.time ? new Date((departure.time as number) * 1000) : null,
    delay: departure?.delay || 0,
  },
})

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
  const stops = trip?.tripUpdate?.stopTimeUpdate || []
  return {
    id: train.id,
    name: `Brightline ${trainNumber}`,
    number: trainNumber,
    updated: timestamp ? new Date((timestamp as number) * 1000) : null,
    status: 'Active', // TODO: determine status
    alerts: [],
    coordinates: longitude && latitude ? [longitude, latitude] : null,
    speed: 0, // TODO: determine speed
    heading: position?.bearing ? position.bearing : null,
    stations: stops.map(processStation), // TODO: fetch and process station info
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
