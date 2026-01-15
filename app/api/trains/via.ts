import { StationResponse, Stop, Train } from '@/app/types'
import { getStations } from '@/app/lib/stations'
import { ViaStationInfo, ViaTrainInfo } from './types'
import { msToMins } from '@/app/utils'

const API_ENDPOINT = 'https://tsimobile.viarail.ca/data/allData.json'

// https://en.wikipedia.org/wiki/List_of_Via_Rail_routes#Current_routes
const trainNamesToNumbers: Record<string, number[]> = {
  Canadian: [1, 2],
  Ocean: [14, 15],
  Corridor: [
    61, 63, 65, 67, 69, 669, 60, 62, 64, 66, 68, 668, 41, 45, 47, 53, 55, 59,
    643, 645, 40, 42, 44, 46, 48, 50, 52, 54, 29, 31, 33, 35, 37, 39, 633, 20,
    22, 24, 26, 28, 38, 622, 87, 84, 71, 73, 75, 79, 70, 72, 76, 78, 43, 82, 83,
    624, 646, 647,
  ],
  'Maple Leaf': [97, 98],
  'Jasper–Prince Rupert': [5, 6],
  'Montreal–Jonquière': [600, 602, 601],
  'Montreal–Senneterre': [604, 606, 603],
  'Sudbury–White River': [186, 185],
  'Winnipeg–Churchill': [690, 692, 691, 693],
  'The Pas–Pukatawagan': [290, 291],
}

const getTrainName = (id: string) => {
  const number = parseInt(id)
  if (isNaN(number)) {
    return
  }
  for (const [name, numbers] of Object.entries(trainNamesToNumbers)) {
    if (numbers.includes(number)) {
      return name
    }
  }
}

const processStop = (
  { code, station, arrival, departure }: ViaStationInfo,
  stations: StationResponse,
): Stop => {
  const arrivalTime = arrival
    ? new Date(arrival.estimated || arrival.scheduled)
    : null
  const departureTime = departure
    ? new Date(departure.estimated || departure.scheduled)
    : null
  const stationMeta = stations[`via/${code}`]
  return {
    code,
    name: station,
    timezone: stationMeta?.timezone,
    arrival: {
      // either arrival time or departure time should exist on every object
      time: arrivalTime || departureTime!,
      delay:
        arrival?.scheduled && arrivalTime
          ? msToMins(
              arrivalTime.getTime() - new Date(arrival.scheduled).getTime(),
            )
          : 0,
    },
    departure: {
      time: departureTime || arrivalTime!,
      delay:
        departure?.scheduled && departureTime
          ? msToMins(
              departureTime.getTime() - new Date(departure.scheduled).getTime(),
            )
          : 0,
    },
  }
}

const processTrain = (
  [id, data]: [string, ViaTrainInfo],
  stations: StationResponse,
): Train => ({
  id: `via/${id}`,
  name: getTrainName(id) || 'VIA Rail',
  number: id,
  coordinates: data.lng ? [data.lng, data.lat] : null,
  speed: data.speed ?? null,
  heading: data.direction ?? null,
  updated: data.poll ? new Date(data.poll) : null,
  status: data.departed
    ? data.arrived
      ? 'Completed'
      : 'Active'
    : 'Predeparture',
  alerts:
    data.alerts?.map((alert) =>
      [alert.header.en, alert.description.en, alert.url.en].join('\n\n'),
    ) || [],
  stops: data.times.map((station) => processStop(station, stations)),
})

const get = async () => {
  try {
    const response = await fetch(API_ENDPOINT)
    const data = (await response.json()) as Record<number, ViaTrainInfo>
    const stations = await getStations()
    const trains = Object.entries(data).map((train) =>
      processTrain(train, stations),
    )
    return trains
  } catch (error) {
    console.error('Error fetching VIA Rail data:', error)
    throw error
  }
}

export default get
