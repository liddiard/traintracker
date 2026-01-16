import fs from 'fs/promises'
import { Feature, Point } from 'geojson'
import { amtrakDecryptResponse, amtrakParseDate } from '../utils'
import { getStations } from '@/app/lib/stations'
import { mphToKmh, msToMins } from '@/app/utils'
import { Train, Stop, StationResponse } from '@/app/types'
import {
  AmtrakHeading,
  AmtrakStationInfoProperties,
  AmtrakTrainInfoProperties,
} from './types'
import { getTrack } from './utils'

// heading name to degree mapping
const headingToDegrees: Record<AmtrakHeading, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

const API_ENDPOINT =
  'https://maps.amtrak.com/services/MapDataService/trains/getTrainsData'

const processRouteName = (name: string) =>
  // Amtrak API sometimes misspells "Northeast" as "Northest" 🙄
  name.replace('Northest', 'Northeast')

const processStops = (
  properties: AmtrakTrainInfoProperties,
  stations: StationResponse,
): Stop[] =>
  Object.entries(properties)
    // Get only Station keys that have values
    .filter(([key, val]) => /^Station\d+$/.test(key) && val)
    // Station keys are numbered in route order, so sort them numerically
    .toSorted(([aKey], [bKey]) => {
      const aNum = parseInt(aKey.replace('Station', ''))
      const bNum = parseInt(bKey.replace('Station', ''))
      return aNum - bNum
    })
    // Parse the JSON-serialized station info
    .map(([_, val]) => JSON.parse(val) as AmtrakStationInfoProperties)
    // Filter out stops with no arrival or departure info
    .filter(
      // arrival keys
      (stop) =>
        ['postarr', 'estarr', 'scharr', 'schdep'].find(
          (key) => stop[key as keyof AmtrakStationInfoProperties],
        ) ||
        // departure keys
        ['postdep', 'estdep', 'schdep'].find(
          (key) => stop[key as keyof AmtrakStationInfoProperties],
        ),
    )
    // Map to desired response format
    .map(({ code, tz, schdep, estdep, postdep, scharr, estarr, postarr }) => {
      // Amtrak often omits scheduled arrival when it is the same as scheduled
      // departure (i.e. no station dwell time is accounted for). In this case,
      // use scheduled departure time as scheduled arrival time.
      const station = stations[`amtrak/${code}`]
      const arrivalTime = amtrakParseDate(
        postarr || estarr || scharr || schdep!,
        { tzCode: tz },
      )
      // For final stations with no departure info, fall back to arrival time
      const departureTime = amtrakParseDate(
        postdep || estdep || schdep || postarr || estarr || scharr!,
        { tzCode: tz },
      )
      return {
        code,
        name: station?.name || code,
        timezone: station?.timezone,
        arrival: {
          time: arrivalTime,
          delay:
            arrivalTime && scharr
              ? msToMins(
                  arrivalTime.getTime() -
                    amtrakParseDate(scharr, { tzCode: tz }).getTime(),
                )
              : 0,
        },
        departure: {
          time: departureTime,
          delay:
            departureTime && schdep
              ? msToMins(
                  departureTime.getTime() -
                    amtrakParseDate(schdep, { tzCode: tz }).getTime(),
                )
              : 0,
        },
      }
    })

const processTrain = async (
  train: Feature<Point, AmtrakTrainInfoProperties>,
  stations: StationResponse,
): Promise<Train> => {
  const { properties } = train
  const statusMessage = properties.StatusMsg?.trim()
  return {
    updated: amtrakParseDate(properties.updated_at, {
      tzCode: 'E', // "Updated" times seem to always been in Eastern Time
      hr24: false,
    }),
    id: `amtrak/${properties.ID.toString()}`,
    name: processRouteName(properties.RouteName),
    number: properties.TrainNum,
    status: properties.TrainState,
    alerts: statusMessage ? [statusMessage] : [],
    coordinates: [train.geometry.coordinates[0], train.geometry.coordinates[1]],
    speed: Math.round(mphToKmh(parseFloat(properties.Velocity))),
    heading: headingToDegrees[properties.Heading] ?? null,
    stops: processStops(properties, stations),
    track: await getTrack(properties.TrainNum, 'amtrak'),
  }
}

const get = async () => {
  const response = await fetch(API_ENDPOINT + `?${Date.now()}=true`)
  const data = await response.text()
  const trains = amtrakDecryptResponse(data)

  await fs.writeFile('original.json', JSON.stringify(trains, null, 2), 'utf8')

  const stations = await getStations()

  const processedTrains = await Promise.all(
    trains.features.map((train) => processTrain(train, stations)),
  )
  return processedTrains.filter((train) => train.stops.length > 0)
}

export default get
