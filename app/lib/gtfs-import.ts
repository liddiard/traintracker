import {
  Config,
  importGtfs,
  openDb,
  getStops,
  getTrips,
  Stop,
  Trip,
  closeDb,
} from 'gtfs'
import { prisma } from './prisma'
import gtfsConfig from './gtfs-config.json'
import { GTFS_IMPORT_ID } from '../constants'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

async function isCacheValid(): Promise<boolean> {
  const meta = await prisma.gtfsImportMeta.findUnique({
    where: { id: GTFS_IMPORT_ID },
  })

  if (!meta) return false

  const age = Date.now() - meta.lastImportedAt.getTime()
  return age < CACHE_TTL_MS
}

function getAgencyFromId(id: string): string {
  return id.split('/')[0]
}

async function importStops(stops: Stop[]): Promise<number> {
  // Map to Prisma format
  const stopData = stops.map((stop) => {
    const agency = getAgencyFromId(stop.stop_id)
    // VIA Rail uses numeric stop IDs that aren't useful to us; use stop_code
    // (4-letter) instead
    const id = stop.stop_id.startsWith('via/')
      ? `via/${stop.stop_code}`
      : stop.stop_id

    return {
      id,
      stopId: stop.stop_id,
      stopCode: stop.stop_code || null,
      stopName: stop.stop_name || null,
      stopDesc: stop.stop_desc || null,
      stopLat: stop.stop_lat || null,
      stopLon: stop.stop_lon || null,
      zoneId: stop.zone_id || null,
      stopUrl: stop.stop_url || null,
      locationType: stop.location_type || null,
      parentStation: stop.parent_station || null,
      stopTimezone: stop.stop_timezone || null,
      wheelchairBoarding: stop.wheelchair_boarding || null,
      platformCode: stop.platform_code || null,
      agency,
    }
  })

  // Clear existing stops and insert new ones
  await prisma.gtfsStop.deleteMany()
  await prisma.gtfsStop.createMany({ data: stopData })

  return stopData.length
}

async function importTrips(trips: Trip[]): Promise<number> {
  // Map to Prisma format
  const tripData = trips.map((trip) => {
    const agency = getAgencyFromId(trip.trip_id)

    return {
      id: trip.trip_id,
      tripId: trip.trip_id,
      routeId: trip.route_id,
      serviceId: trip.service_id,
      tripHeadsign: trip.trip_headsign || null,
      tripShortName: trip.trip_short_name || null,
      directionId: trip.direction_id || null,
      blockId: trip.block_id || null,
      shapeId: trip.shape_id || null,
      wheelchairAccessible: trip.wheelchair_accessible || null,
      bikesAllowed: trip.bikes_allowed || null,
      agency,
    }
  })

  // Clear existing trips and insert new ones
  await prisma.gtfsTrip.deleteMany()
  await prisma.gtfsTrip.createMany({ data: tripData })

  return tripData.length
}

export async function importGtfsData(): Promise<void> {
  // Check if we can use cached data
  if (await isCacheValid()) {
    console.log('Using cached GTFS data (less than 24 hours old)')
    return
  }

  console.log('Importing GTFS data from VIA Rail and Brightline feeds...')

  // Use in-memory database for node-gtfs
  const config = {
    ...gtfsConfig,
    sqlitePath: ':memory:',
  } as Config

  // Download and parse GTFS feeds
  await importGtfs(config)
  openDb(config)

  // Get data from node-gtfs
  const stops = getStops()
  const trips = getTrips()

  // Import into Prisma tables
  const stopCount = await importStops(stops)
  const tripCount = await importTrips(trips)

  // Update import metadata
  await prisma.gtfsImportMeta.upsert({
    where: { id: GTFS_IMPORT_ID },
    update: { lastImportedAt: new Date() },
    create: { id: GTFS_IMPORT_ID, lastImportedAt: new Date() },
  })

  // Close the in-memory database after import
  closeDb()

  console.log(
    `GTFS import complete: ${stopCount} stops, ${tripCount} trips imported`,
  )
}
