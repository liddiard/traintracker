import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

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

const get = async () => {
  try {
    // train positions
    const positions = await fetchPositions()
    console.log('***positions:', JSON.stringify(positions, null, 2))

    const trips = await fetchTrips()
    console.log('***trips:', JSON.stringify(trips, null, 2))

    return [] // TODO: process and return Brightline trains
  } catch (error) {
    console.error('Error fetching Via Rail data:', error)
    throw error
  }
}

export default get
