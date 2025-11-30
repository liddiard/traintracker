import { ReactNode } from 'react'

export interface TrainResponse {
  [key: string]: TrainRaw[]
}

interface TrainRaw {
  routeName: string
  trainNum: string
  trainID: string
  lat: number
  lon: number
  trainTimely: string
  stations: StationTrainRaw[]
  heading: string
  eventCode: string
  eventTZ: string
  eventName: string
  origCode: string
  originTZ: string
  origName: string
  destCode: string
  destTZ: string
  destName: string
  trainState: 'Predeparture' | 'Active' | 'Completed'
  velocity: number
  statusMsg: string
  createdAt: string
  updatedAt: string
  lastValTS: string
  objectID: number | null
  provider: string
}

export interface Train extends Omit<
  TrainRaw,
  'objectID' | 'createdAt' | 'updatedAt' | 'lastValTS' | 'stations'
> {
  objectID: string
  createdAt: Date
  updatedAt: Date
  lastValTS: Date
  stations: StationTrain[]
}

export interface Station {
  name: string
  code: string
  tz: string
  lat: number
  lon: number
  hasAddress: boolean
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  trains: string[]
}

export interface StationTrainRaw extends Station {
  bus: boolean
  schArr: string
  schDep: string
  arr: string | null
  dep: string | null
  arrCmnt: string
  depCmnt: string
  status: 'Departed' | 'Station' | 'Enroute'
  platform: string
}

export interface StationTrain extends Omit<
  StationTrainRaw,
  'schArr' | 'schDep' | 'arr' | 'dep'
> {
  schArr: Date
  schDep: Date
  arr: Date | null
  dep: Date | null
}

export type Route = Record<string, Set<string>>

export enum TimeStatus {
  PREDEPARTURE,
  ON_TIME,
  DELAYED,
  COMPLETE,
}

export interface TrainStatus {
  objectID: string
  code?: number
  prevStation?: StationTrain
  curStation?: StationTrain
  nextStation?: StationTrain
  deviation?: number
  firstStation: StationTrain
  lastStation: StationTrain
  updatedAt: Date
}

export interface Option {
  value: string
  label: string
}

export interface TrackFeatureProperties {
  OBJECTID: number
  name: string
  shape_leng: number
}

export interface TrainFeatureProperties {
  objectID: string
  routeCode: string
  trainNum: string
  color?: string
  bearing?: number
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
