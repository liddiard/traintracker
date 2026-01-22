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
 * Generates a GeoJSON file for map display from in-memory GTFS shapes data.
 *
 * @param shapes Array of Shape objects from GTFS data
 * @param outputPath GeoJSON file to output to, relative to app root
 */
async function generateGeoJson(
  shapes: Shape[],
  outputPath = 'public/map_data/track.json',
): Promise<void> {
  // Group shapes by agency and shapeId, collecting points for each
  const shapeMap = new Map<
    string,
    {
      agency: string
      shapeId: string
      points: Array<{ ptLat: number; ptLon: number; ptSequence: number }>
    }
  >()

  for (const shape of shapes) {
    const agency = getAgencyFromId(shape.shape_id)
    const shapeId = getOriginalId(shape.shape_id)
    const key = `${agency}:${shapeId}`

    if (!shapeMap.has(key)) {
      shapeMap.set(key, { agency, shapeId, points: [] })
    }

    shapeMap.get(key)!.points.push({
      ptLat: shape.shape_pt_lat,
      ptLon: shape.shape_pt_lon,
      ptSequence: shape.shape_pt_sequence,
    })
  }

  // Sort points by sequence and convert to GeoJSON features
  const features = Array.from(shapeMap.values())
    .map((shape) => {
      // Sort points by sequence
      shape.points.sort((a, b) => a.ptSequence - b.ptSequence)

      return {
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
      }
    })
    .concat(supplementalTrack)

  const geojson = JSON.stringify({
    type: 'FeatureCollection',
    features,
  })
  await fs.writeFile(outputPath, geojson, 'utf-8')
}

export async function importGtfsData(): Promise<void> {
  try {
    // Check if we can use cached data
    if (await isCacheValid()) {
      console.log('Using cached GTFS data (less than 24 hours old)')
      return
    }
  } catch (error) {
    // If we can't check cache (e.g., database error), log warning and skip import
    // This prevents the app from crashing on startup if the database is readonly
    const errorCode = (error as { code?: string }).code
    if (errorCode === 'SQLITE_READONLY') {
      console.warn(
        'GTFS import skipped: Database is read-only. This may happen if volume permissions are incorrect.',
      )
      console.warn(
        'To fix: docker-compose down && docker volume rm traintracker-db && docker-compose up -d',
      )
      return
    }
    console.warn('Could not check GTFS cache validity:', error)
  }

  console.log('Importing GTFS data...')

  let config: Config | null = null
  try {
    config = gtfsConfig as Config

    // Download and parse GTFS feeds
    await importGtfs(config)
    openDb(config)

    // Get data from node-gtfs
    const stops = getStops()
    const trips = getTrips()
    const shapes = getShapes()

    console.log('Upserting GTFS data into database...')

    // Import stops and trips into Prisma tables (shapes are only used for GeoJSON generation)
    const stopCount = await importStops(stops)
    const tripCount = await importTrips(trips)

    // Update import metadata
    await prisma.gtfsImportMeta.upsert({
      where: { id: GTFS_IMPORT_ID },
      update: { lastImportedAt: new Date() },
      create: { id: GTFS_IMPORT_ID, lastImportedAt: new Date() },
    })

    console.log(
      `GTFS import complete: ${stopCount} stops, ${tripCount} trips, ${shapes.length} shapes`,
    )

    // Only generate GeoJSON in development (in production, it's pre-built at Docker build time)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Generating shapes GeoJSON...')
      await generateGeoJson(shapes)
      console.log('Shapes GeoJSON generated.')
    }
  } catch (error) {
    const errorCode = (error as { code?: string }).code
    if (errorCode === 'SQLITE_READONLY') {
      console.error(
        'GTFS import failed: Database is read-only. The app will continue but GTFS data may be stale.',
      )
      console.error(
        'To fix: docker-compose down && docker volume rm traintracker-db && docker-compose up -d',
      )
    } else {
      console.error('GTFS import failed:', error)
    }
    // Don't rethrow - allow app to start even if GTFS import fails
  } finally {
    // Close the in-memory database after import (if it was opened)
    if (config) {
      try {
        closeDb()
      } catch {
        // Ignore errors closing the db
      }
    }
  }
}
