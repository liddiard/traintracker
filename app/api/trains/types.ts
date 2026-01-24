// NOTE: Interface definitions in this file are not exhaustive. We only define the
// parts we use in some way in the upstream API responses.

import { TrainStatus } from '@/app/types'

// Amtrak API timezones: Pacific, Mountain, Central, Eastern
export type AmtrakTZCode = 'P' | 'M' | 'C' | 'E'

// Amtrak API headings
export type AmtrakHeading = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

// Amtrak API GeoJSON properties available on train features
export interface AmtrakTrainInfoProperties {
  ID: number
  OBJECTID: number
  StatusMsg: string | null
  Heading: AmtrakHeading
  RouteName: string
  TrainState: TrainStatus
  OriginTZ: AmtrakTZCode
  updated_at: string
  TrainNum: string
  Velocity: string
}

// Amtrak API properties available on train feature properties' "Station\d+" keys
export interface AmtrakStationInfoProperties {
  code: string
  tz: AmtrakTZCode
  scharr?: string
  schdep?: string
  estarr?: string
  estdep?: string
  postarr?: string
  postdep?: string
}

// Amtrak station info from US DOT
export interface AmtrakStationCSV {
  Code: string
  StationName: string
  StnType: 'TRAIN' | 'BUS'
  lon: number
  lat: number
}

// Via Rail API train info structure
export interface ViaTrainInfo {
  lat: number
  lng: number
  speed: number
  direction: number
  poll?: string
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
export interface ViaStationInfo {
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

export interface BrightlineTrainInfo {
  id: string
  vehicle: {
    trip: {
      tripId: string
      startTime: string
      startDate: string
      routeId: string
    }
    position: {
      latitude: number
      longitude: number
      bearing: number
    }
    timestamp: string
    vehicle: {
      id: string
    }
  }
}

export interface BrightlineTripInfo {
  id: string
  tripUpdate: {
    trip: {
      tripId: string
      startTime: string
      startDate: string
      routeId: string
    }
    stopTimeUpdate: BrightlineStationInfo[]
    vehicle: {
      id: string
    }
    timestamp: string
  }
}

export interface BrightlineStationInfo {
  stopId: string
  arrival: {
    delay: number
    time: string
  }
  departure: {
    delay: number
    time: string
  }
}
