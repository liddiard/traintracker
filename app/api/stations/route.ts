import { Config, importGtfs, openDb, getStops, Stop } from 'gtfs'
import Papa from 'papaparse'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import gtfsConfig from './gtfs-config.json'
import stationTimezoneMap from './station-timezone-map.json'
import { Station, StationResponse } from '@/app/types'
import { AmtrakStationCSV } from '../trains/types'

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

  return parsed.data.reduce((acc, amtrakStation) => {
    if (!amtrakStation.Code) return acc // Skip rows without station codes
    return {
      ...acc,
      [`amtrak/${amtrakStation.Code}`]: processAmtrakStation(amtrakStation),
    }
  }, {} as StationResponse)
}

const config = gtfsConfig as Config
importGtfs(config).then(() => {
  openDb(config)
  const stops = getStops()
  const gtfsStations = processStations(stops)
  const amtrakStations = loadAmtrakStations()

  // Merge CSV stations with GTFS stations, preferring GTFS data
  stations = { ...amtrakStations, ...gtfsStations }
})

const processStationName = (name: string): string =>
  name.replace(/Station|Amtrak|Bus Stop/g, '').trim()

const processStation = (stop: Stop): Station => ({
  code: stop.stop_code || stop.stop_id.split('/')[1], // remove agency prefix
  name: stop.stop_name
    ? processStationName(stop.stop_name)
    : stop.stop_code || stop.stop_id.split('/')[1],
  timezone: stop.stop_timezone!,
  coordinates: [stop.stop_lon!, stop.stop_lat!],
})

const processAmtrakStation = (amtrakStation: AmtrakStationCSV): Station => ({
  code: amtrakStation.Code,
  // for stations in the form "city, state", format, retain only the city
  name: processStationName(amtrakStation.StationName).split(', ')[0],
  timezone:
    stationTimezoneMap[amtrakStation.Code as keyof typeof stationTimezoneMap] ||
    'UTC',
  coordinates: [amtrakStation.lon, amtrakStation.lat],
})

const processStations = (stops: Pick<Stop, keyof Stop>[]) =>
  stops.reduce(
    (acc, stop) => ({
      ...acc,
      // VIA Rail uses numeric stop IDs which aren't useful to us for lookup. Replace
      // them with the 4-letter station codes.
      [stop.stop_id.startsWith('via/')
        ? `via/${stop.stop_code}`
        : stop.stop_id]: processStation(stop),
    }),
    {},
  )

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
