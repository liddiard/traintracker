// NOTE: Interface definitions in this file are not exhaustive. We only define the
// parts we use in some way in the returned API response.

type TrainStatus = 'Predeparture' | 'Active' | 'Completed'

// Pacific, Mountain, Central, Eastern
type AmtrakTZCode = 'P' | 'M' | 'C' | 'E'

// Amtrak API enums
type Heading = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

// Amtrak API GeoJSON properties available on train features
interface AmtrakTrainInfoProperties {
  OBJECTID: number
  StatusMsg: string
  Heading: Heading
  RouteName: string
  TrainState: TrainStatus
  OriginTZ: AmtrakTZCode
  updated_at: string
  TrainNum: string
  Velocity: string
}

// Via Rail API train info structure
interface ViaTrainInfo {
  lat: number
  lng: number
  speed: number
  direction: number
  poll: string
  departed: boolean
  arrived: boolean
  times: ViaStationInfo[]
  alerts: {
    header: {
      en: string
      fr: string
    }
    description: {
      en: string
      fr: string
    }
    url: {
      en: string
      fr: string
    }
  }[]
}

// Via Rail API station info ("times" array) structure
interface ViaStationInfo {
  code: string
  station: string
  scheduled: string
  estimated: string
  eta: string
  arrival?: {
    estimated: string
    scheduled: string
  }
  departure?: {
    estimated: string
    scheduled: string
  }
}

// Station data from Amtraker API (https://api-v3.amtraker.com/v3/stations)
// Used to get Via station timezones
interface AmatrakerStationInfo {
  code: string
  name: string
  tz: string
  lat: number
  lon: number
}

// Our returned processed trains
interface TrainResponse {
  updated: Date | null
  id: string
  name: string
  number: string
  status: TrainStatus
  alerts: string[]
  coordinates: [number, number] | null
  speed: number
  heading: number
  stations: StationResponse[]
}

// Our returned processed train stations
interface StationResponse {
  code: string
  name: string
  timezone: string
  departure: {
    scheduled: Date | null
    estimated: Date | null
    actual: Date | null
  }
  arrival: {
    scheduled: Date | null
    estimated: Date | null
    actual: Date | null
  }
}
