import { viaStationToTZDB } from '../data'

const API_ENDPOINT = 'https://tsimobile.viarail.ca/data/allData.json'

// https://en.wikipedia.org/wiki/List_of_Via_Rail_routes#Current_routes
const trainNamesToNumbers: Record<string, number[]> = {
  Canadian: [1, 2],
  Ocean: [14, 15],
  Corridor: [
    61, 63, 65, 67, 69, 669, 60, 62, 64, 66, 68, 668, 41, 45, 47, 53, 55, 59,
    643, 645, 40, 42, 44, 46, 48, 50, 52, 54, 29, 31, 33, 35, 37, 39, 633, 20,
    22, 24, 26, 28, 38, 622, 87, 84, 71, 73, 75, 79, 70, 72, 76, 78, 43, 82, 83,
    646, 647,
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

const processStation = ({
  code,
  station,
  eta,
  arrival,
  departure,
}: ViaStationInfo): StationResponse => {
  // indicates the train already arrived at this station, and the estimated
  // arrival time becomes the actual arrival time
  const arrived = eta === 'ARR'
  // if the estimated departure time is in the past, the train has departed
  // and the estimated departure time becomes the actual departure time
  const departed =
    departure?.estimated && new Date(departure.estimated) <= new Date()

  return {
    code,
    name: station,
    timezone: viaStationToTZDB[code],
    arrival: {
      scheduled:
        arrived || !arrival?.scheduled ? null : new Date(arrival.scheduled),
      estimated:
        arrived || !arrival?.estimated ? null : new Date(arrival.estimated),
      actual:
        arrived && arrival?.estimated ? new Date(arrival.estimated) : null,
    },
    departure: {
      scheduled:
        departed || !departure?.scheduled
          ? null
          : new Date(departure.scheduled),
      estimated:
        departed || !departure?.estimated
          ? null
          : new Date(departure.estimated),
      actual:
        departed && departure?.estimated ? new Date(departure.estimated) : null,
    },
  }
}

const processTrain = ([id, data]: [string, ViaTrainInfo]): TrainResponse => ({
  id,
  coordinates: data.lng ? [data.lng, data.lat] : null,
  speed: data.speed,
  heading: data.direction,
  name: getTrainName(id) || `VIA Rail ${id}`,
  number: id,
  updated: new Date(data.poll),
  status: data.departed
    ? data.arrived
      ? 'Completed'
      : 'Active'
    : 'Predeparture',
  alerts:
    data.alerts?.map((alert) =>
      [alert.header.en, alert.description.en, alert.url.en].join('\n\n'),
    ) || [],
  stations: data.times.map(processStation),
})

const get = async () => {
  try {
    const response = await fetch(API_ENDPOINT)
    const data = (await response.json()) as Record<number, ViaTrainInfo>
    const trains = Object.entries(data).map(processTrain)
    return trains
  } catch (error) {
    console.error('Error fetching Via Rail data:', error)
    throw error
  }
}

export default get
