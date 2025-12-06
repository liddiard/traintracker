import fs from 'fs/promises'
import { Config, importGtfs, openDb, getStops, closeDb, Stop } from 'gtfs'
import gtfsConfig from './gtfs-config.json'

export let stations: Record<string, StationResponse> = {}

const config = gtfsConfig as Config
importGtfs(config).then(() => {
  openDb(config)
  const stops = getStops()
  stations = processStations(stops)
})

const processStationName = (name: string): string =>
  name.replace(/Station|Amtrak|Bus Stop/g, '').trim()

const processStation = (stop: Stop): StationResponse => ({
  code: stop.stop_code || stop.stop_id.split('/')[1], // remove agency prefix
  name: stop.stop_name ? processStationName(stop.stop_name) : null,
  timezone: stop.stop_timezone,
  coordinates:
    stop.stop_lon && stop.stop_lat ? [stop.stop_lon, stop.stop_lat] : null,
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
    await fs.writeFile(
      'stations.json',
      JSON.stringify(stations, null, 2),
      'utf8',
    )

    const res = await fetch('https://api-v3.amtraker.com/v3/stations', {
      next: { revalidate: 60 * 60 }, // cache for 1 hour
    })
    const data = await res.json()
    return Response.json(data)
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
