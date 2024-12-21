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

export interface Train
  extends Omit<
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

export interface StationTrain
  extends Omit<StationTrainRaw, 'schArr' | 'schDep' | 'arr' | 'dep'> {
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
  code?: number
  prevStation?: StationTrain
  curStation?: StationTrain
  nextStation?: StationTrain
  deviation?: number
  firstStation: StationTrain
  lastStation: StationTrain
}

export interface Option {
  value: string
  label: string
}

type TrainSearchKeys = 'from' | 'to' | 'trainNumber' | 'trainName'
export type TrainSearchParams = Partial<Record<TrainSearchKeys, string>>
