import { Config, importGtfs, openDb, getStops, Stop } from 'gtfs'
import Papa from 'papaparse'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import gtfsConfig from './gtfs-config.json'
import { Station, StationResponse } from '@/app/types'
import { AmtrakStationCSV } from '../trains/types'
import { stationCodeToTz, stationCodeToName } from './amtrakStations'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export let stations: StationResponse = {}

const loadAmtrakStations = (): StationResponse => {
  const csvContent = readFileSync(
    path.join(__dirname, './amtrak-stations.csv'),
    'utf-8',
  )
  const parsed = Papa.parse<AmtrakStationCSV>(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return parsed.data
    .filter((station) => station.StnType === 'TRAIN')
    .reduce((acc, amtrakStation) => {
      if (!amtrakStation.Code) return acc // Skip rows without station codes
      return {
        ...acc,
        [`amtrak/${amtrakStation.Code}`]: processCsvStation(amtrakStation),
      }
    }, {} as StationResponse)
}

const processStationName = (name: string): string =>
  name.replace(/Station|Amtrak/g, '').trim()

const processGtfsStation = (stop: Stop): Station => {
  const code = stop.stop_code || stop.stop_id.split('/')[1] // remove agency prefix
  return {
    code,
    name:
      stationCodeToName[code] ||
      (stop.stop_name ? processStationName(stop.stop_name) : code),
    timezone: stop.stop_timezone!,
    coordinates: [stop.stop_lon!, stop.stop_lat!],
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

const processGtfsStations = (stops: Pick<Stop, keyof Stop>[]) =>
  stops
    .filter((stop) => !stop.stop_name?.includes('Bus Stop'))
    .reduce(
      (acc, stop) => ({
        ...acc,
        // VIA Rail uses numeric stop IDs which aren't useful to us for lookup. Replace
        // them with the 4-letter station codes.
        [stop.stop_id.startsWith('via/')
          ? `via/${stop.stop_code}`
          : stop.stop_id]: processGtfsStation(stop),
      }),
      {},
    )

const config = gtfsConfig as Config
importGtfs(config).then(() => {
  openDb(config)
  const stops = getStops()
  const gtfsStations = processGtfsStations(stops)
  const amtrakStations = loadAmtrakStations()

  // Merge CSV stations with GTFS stations, preferring GTFS data
  stations = { ...amtrakStations, ...gtfsStations }
})

export async function GET() {
  try {
    return Response.json(stations)
  } catch (error) {
    console.log(error)
    let message
    if (error instanceof Error) message = error.message
    else message = String(error)
    return Response.json(
      {
        status: 502,
        error: `Failed to fetch data from upstream: ${message}`,
      },
      { status: 502 },
    )
  }
}
