import {
  Config,
  importGtfs,
  openDb,
  getStops,
  getTrips,
  Stop,
  Trip,
  Shape,
  closeDb,
  getShapes,
} from 'gtfs'
import { prisma } from './prisma'
import gtfsConfig from './gtfs-config.json'
import { GTFS_IMPORT_ID } from './constants'
import fs from 'fs/promises'
import { roundToDecimals } from './utils'
import supplementalTrips from './trips-supplemental.json'
import goldRunnerOKJ from '@/gis/gold_runner_okj_flat.json'
import goldRunnerSAC from '@/gis/gold_runner_sac_flat.json'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const supplementalTrack = [...goldRunnerOKJ.features, ...goldRunnerSAC.features]

async function isCacheValid(): Promise<boolean> {
  const meta = await prisma.gtfsImportMeta.findUnique({
    where: { id: GTFS_IMPORT_ID },
  })

  if (!meta) return false

  const age = Date.now() - meta.lastImportedAt.getTime()
  return age < CACHE_TTL_MS
}

// Extract agency prefix from ID in format "agency/original_id"
function getAgencyFromId(id: string): string {
  return id.split('/')[0]
}

// Extract original ID from namespaced ID in format "agency/original_id"
function getOriginalId(id: string): string {
  return id.split('/')[1]
}

async function importStops(stops: Stop[]): Promise<number> {
  // Map to Prisma format
  const stopData = stops.map((stop) => ({
    // VIA Rail's GTFS data uses numeric stop IDs that aren't useful to us; use
    // stop_code (4-letter) instead
    id: stop.stop_id.startsWith('via/')
      ? `via/${stop.stop_code}`
      : stop.stop_id,
    agency: getAgencyFromId(stop.stop_id),
    stopCode: stop.stop_code || null,
    stopName: stop.stop_name || null,
    stopLat: stop.stop_lat || null,
    stopLon: stop.stop_lon || null,
    stopTimezone: stop.stop_timezone || null,
    wheelchairBoarding: stop.wheelchair_boarding || null,
  }))

  // Clear existing stops and insert new ones
  await prisma.gtfsStop.deleteMany()
  await prisma.gtfsStop.createMany({ data: stopData })

  return stopData.length
}

async function importTrips(trips: Trip[]): Promise<number> {
  // Map to Prisma format, adding missing Gold Runner trips from supplemental data
  const tripData = trips
    .map((trip) => ({
      id: trip.trip_id,
      agency: getAgencyFromId(trip.trip_id),
      tripShortName: trip.trip_short_name || null,
      shapeId: trip.shape_id || null,
    }))
    .concat(supplementalTrips)
  // Clear existing trips and insert new ones
  await prisma.gtfsTrip.deleteMany()
  await prisma.gtfsTrip.createMany({ data: tripData })

  return tripData.length
}

/**
 * Queries imported GTFS shapes and generates a GeoJSON file for map display.
 *
 * @param outputPath GeoJSON file to output to, relative to app root
 */
async function generateGeoJson(
  outputPath = 'public/map_data/track.json',
): Promise<void> {
  const shapes = await prisma.gtfsShape.groupBy({
    by: ['agency', 'shapeId'],
  })
  // For each shape, get its points ordered by ptSequence
  const shapesWithPoints = await Promise.all(
    shapes.map(async (shape) => {
      const points = await prisma.gtfsShape.findMany({
        where: {
          agency: shape.agency,
          shapeId: shape.shapeId,
        },
        orderBy: {
          ptSequence: 'asc',
        },
      })
      return {
        ...shape,
        points,
      }
    }),
  )
  // map to GeoJSON features, adding missing `supplementalTrack`, which should have
  // `agency` and `id` properties that match `supplementalTrips`
  const features = shapesWithPoints
    .map((shape) => ({
      type: 'Feature',
      properties: {
        id: shape.shapeId,
        agency: shape.agency,
      },
      geometry: {
        type: 'LineString',
        coordinates: shape.points.map((point) => [
          // round to 5 decimal places (~1 meter) to reduce file size
          roundToDecimals(point.ptLon, 5),
          roundToDecimals(point.ptLat, 5),
        ]),
      },
    }))
    .concat(supplementalTrack)
  const geojson = JSON.stringify({
    type: 'FeatureCollection',
    features,
  })
  await fs.writeFile(outputPath, geojson, 'utf-8')
}

export async function importShapes(shapes: Shape[]): Promise<number> {
  // Map to Prisma format
  const shapeData = shapes.map((shape) => ({
    id: `${shape.shape_id}-${shape.shape_pt_sequence}`,
    shapeId: getOriginalId(shape.shape_id),
    ptLat: shape.shape_pt_lat,
    ptLon: shape.shape_pt_lon,
    ptSequence: shape.shape_pt_sequence,
    agency: getAgencyFromId(shape.shape_id),
  }))

  // Clear existing shapes and insert new ones
  await prisma.gtfsShape.deleteMany()
  await prisma.gtfsShape.createMany({ data: shapeData })

  return shapeData.length
}

export async function importGtfsData(): Promise<void> {
  // Check if we can use cached data
  if (await isCacheValid()) {
    console.log('Using cached GTFS data (less than 24 hours old)')
    return
  }

  console.log('Importing GTFS data...')

  const config = gtfsConfig as Config

  // Download and parse GTFS feeds
  await importGtfs(config)
  openDb(config)

  // Get data from node-gtfs
  const stops = getStops()
  const trips = getTrips()
  const shapes = getShapes()

  console.log('Upserting GTFS data into database (30-60 sec)...')

  // Import into Prisma tables
  const stopCount = await importStops(stops)
  const tripCount = await importTrips(trips)
  const shapeCount = await importShapes(shapes)

  // Update import metadata
  await prisma.gtfsImportMeta.upsert({
    where: { id: GTFS_IMPORT_ID },
    update: { lastImportedAt: new Date() },
    create: { id: GTFS_IMPORT_ID, lastImportedAt: new Date() },
  })

  // Close the in-memory database after import
  closeDb()

  console.log(
    `GTFS import complete: ${stopCount} stops, ${tripCount} trips, ${shapeCount} shapes`,
  )

  console.log('Generating shapes GeoJSON (5-10 sec)...')
  await generateGeoJson()
  console.log('Shapes GeoJSON generated.')
}
