import Papa from 'papaparse'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from './prisma'
import { GtfsStop } from '@/db/generated/client'
import { Station, StationResponse } from '@/app/types'
import { AmtrakStationCSV } from '@/app/api/trains/types'
import {
  stationCodeToTz,
  stationCodeToName,
} from '@/app/api/stations/amtrakStations'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const processStationName = (name: string): string =>
  name.replace(/Station|Amtrak/g, '').trim()

const processGtfsStation = (stop: GtfsStop): Station => {
  const code = stop.stopCode || stop.id.split('/')[1] // remove agency prefix
  return {
    code,
    name:
      stationCodeToName[code] ||
      (stop.stopName ? processStationName(stop.stopName) : code),
    timezone: stop.stopTimezone!,
    coordinates: [stop.stopLon!, stop.stopLat!],
  }
}

const processCsvStation = (amtrakStation: AmtrakStationCSV): Station => ({
  code: amtrakStation.Code,
  // for stations in the form "city, state", format, retain only the city
  name:
    stationCodeToName[amtrakStation.Code] ||
    processStationName(amtrakStation.StationName).split(', ')[0],
  timezone: stationCodeToTz[amtrakStation.Code] || 'UTC',
  coordinates: [amtrakStation.lon, amtrakStation.lat],
})

const processGtfsStations = (stops: GtfsStop[]): StationResponse =>
  stops.reduce(
    (acc, stop) => ({
      ...acc,
      [stop.id]: processGtfsStation(stop),
    }),
    {} as StationResponse,
  )

export const processCsvStations = (): StationResponse => {
  const csvContent = readFileSync(
    path.join(__dirname, '../api/stations/amtrak-stations.csv'),
    'utf-8',
  )
  const parsed = Papa.parse<AmtrakStationCSV>(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return (
    parsed.data
      // exclude bus stops and other non-train station types
      .filter((station) => station.StnType === 'TRAIN')
      .reduce((acc, amtrakStation) => {
        if (!amtrakStation.Code) return acc // Skip rows without station codes
        return {
          ...acc,
          [`amtrak/${amtrakStation.Code}`]: processCsvStation(amtrakStation),
        }
      }, {} as StationResponse)
  )
}

// Cache for stations to avoid repeated DB queries
let stationsCache: StationResponse | null = null
let cacheTime = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function getStations(): Promise<StationResponse> {
  const now = Date.now()
  if (stationsCache && now - cacheTime < CACHE_TTL_MS) {
    return stationsCache
  }

  // Load GTFS stations from Prisma (populated at app startup)
  const gtfsStops = await prisma.gtfsStop.findMany()
  const gtfsStations = processGtfsStations(gtfsStops)

  // Load Amtrak stations from CSV
  // Why? Amtrak's GTFS station data is messy and doesn't provide a way to
  // differentiate rail vs. bus stops (we only want rail), hence getting it
  // from a separate data source.
  const csvStations = processCsvStations()

  // Merge CSV stations with GTFS stations, preferring GTFS data
  stationsCache = { ...csvStations, ...gtfsStations }
  cacheTime = now

  return stationsCache
}
