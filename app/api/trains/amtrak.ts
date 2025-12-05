import { Feature, Point } from 'geojson'
import { amtrakStationCodeToName, amtrakTZCodeToTZDB } from '../data'
import { amtrakDecryptResponse, amtrakParseDate } from '../utils'

// heading name to degree mapping
const headingToDegrees: Record<Heading, number> = {
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

// Amtrak API properties available on train feature properties' "Station\d+" keys
interface StationInfoProperties {
  code: string
  tz: AmtrakTZCode
  scharr: string
  schdep: string
  estarr?: string
  estdep?: string
  postarr?: string
  postdep?: string
}

const processStations = (
  properties: AmtrakTrainInfoProperties,
): StationResponse[] =>
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
    .map(([_, val]) => JSON.parse(val) as StationInfoProperties)
    // Map to desired response format
    .map(({ code, tz, schdep, estdep, postdep, scharr, estarr, postarr }) => ({
      code,
      name: amtrakStationCodeToName[code] || code,
      timezone: amtrakTZCodeToTZDB[tz],
      arrival: {
        scheduled: scharr
          ? amtrakParseDate(scharr, {
              tzCode: tz,
            })
          : // Amtrak often omits scheduled arrival when it is the same as scheduled
            // departure (i.e. no station dwell time is accounted for). In this case,
            // use scheduled departure time as scheduled arrival time.
            amtrakParseDate(schdep, {
              tzCode: tz,
            }),
        estimated: estarr ? amtrakParseDate(estarr, { tzCode: tz }) : null,
        actual: postarr ? amtrakParseDate(postarr, { tzCode: tz }) : null,
      },
      departure: {
        scheduled: schdep
          ? amtrakParseDate(schdep, {
              tzCode: tz,
            })
          : null,
        estimated: estdep ? amtrakParseDate(estdep, { tzCode: tz }) : null,
        actual: postdep ? amtrakParseDate(postdep, { tzCode: tz }) : null,
      },
    }))

const processTrain = (
  train: Feature<Point, AmtrakTrainInfoProperties>,
): TrainResponse => {
  const { properties } = train
  const statusMessage = properties.StatusMsg.trim()
  return {
    updated: amtrakParseDate(properties.updated_at, {
      tzCode: properties.OriginTZ,
      _24hr: false,
    }),
    id: properties.OBJECTID.toString(),
    name: properties.RouteName,
    number: properties.TrainNum,
    status: properties.TrainState,
    alerts: statusMessage ? [statusMessage] : [],
    coordinates: [train.geometry.coordinates[0], train.geometry.coordinates[1]],
    speed: Math.round(parseFloat(properties.Velocity)),
    heading: headingToDegrees[properties.Heading],
    stations: processStations(properties),
  }
}

const get = async () => {
  const response = await fetch(API_ENDPOINT + `?${Date.now()}=true`)
  const data = await response.text()
  const trains = amtrakDecryptResponse(data)
  return trains.features.map(processTrain)
}

export default get
