import { ReactNode } from 'react'

export type Route = Record<string, Set<string>>

export type TrainStatus = 'Predeparture' | 'Active' | 'Completed'

export interface Train {
  updated: Date | null
  id: string
  name: string
  number: string
  status: TrainStatus
  alerts: string[]
  coordinates: [number, number] | null // [lon, lat] per GeoJSON spec
  speed: number | null
  heading: number | null
  stops: Stop[]
}

// Train API response before parsing dates
export interface TrainResponseItem extends Omit<Train, 'updated' | 'stops'> {
  updated: string | null
  stops: StopResponse
}

export type TrainResponse = TrainResponseItem[]

export interface Stop {
  code: string
  name: string
  timezone: string
  departure: {
    // estimated or actual departure time
    time: Date
    // deviation from scheduled time in minutes
    delay: number
  }
  arrival: {
    // estimated or actual arrival time
    time: Date
    // deviation from scheduled time in minutes
    delay: number
  }
}

// Train stops from API response before parsing dates
export interface StopResponseItem extends Omit<Stop, 'departure' | 'arrival'> {
  departure: {
    time: string
    delay: number
  }
  arrival: {
    time: string
    delay: number
  }
}

export type StopResponse = StopResponseItem[]

export interface Station {
  code: string
  name: string
  timezone: string
  coordinates: [number, number] // [lon, lat] per GeoJSON spec
}

export type StationResponse = Record<string, Station>

export enum TimeStatus {
  PREDEPARTURE,
  ON_TIME,
  DELAYED,
  COMPLETE,
}

export interface TrainMeta {
  id: string
  code?: number
  prevStop?: Stop
  curStop?: Stop
  nextStop?: Stop
  firstStop: Stop
  lastStop: Stop
  delay: number
  updated: Date | null
}

export interface Option {
  value: string
  label: string | null
}

export interface TrackFeatureProperties {
  OBJECTID: number
  name: string
  shape_leng: number
}

export interface TrainFeatureProperties extends Omit<
  Train,
  'status' | 'alerts' | 'stops' | 'coordinates'
> {
  color?: string
  gpsCoordinates: number[] | null
  lastUpdatedStr: string
  shortcode: string
}

type TrainSearchKeys = 'from' | 'to' | 'trainNumber' | 'trainName'
export type TrainSearchParams = Partial<Record<TrainSearchKeys, string>>

export interface TrackId {
  id: number
  index?: number
}

export enum InputType {
  TEXT,
  NUMBER,
}

export type MapStyle = 'gray' | 'simple' | 'detailed'
export type ColorMode = 'auto' | 'light' | 'dark'
export type Units = 'miles' | 'kilometers'
export type TimeFormat = '12hr' | '24hr'
export type TimeZone = 'local' | 'device'

export interface Settings {
  mapStyle: MapStyle
  colorMode: ColorMode
  units: Units
  timeFormat: TimeFormat
  timeZone: TimeZone
}

export type SettingValue = MapStyle | ColorMode | Units | TimeFormat | TimeZone

export interface SettingOption {
  label: string
  value: SettingValue
}

export interface SettingConfig {
  label: string
  key: keyof Settings
  options: SettingOption[]
  value: SettingValue
  customUI?: (
    option: SettingOption,
    isSelected: boolean,
    onChange: (value: SettingValue) => void,
  ) => ReactNode
}
