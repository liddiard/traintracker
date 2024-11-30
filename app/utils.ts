import { Station, StationTrainRaw, TrainResponse, Train, TimeStatus, TrainStatus, Route } from './types'

export const createRouteNumMap = (trains: Train[]) =>
  trains
    .reduce(
      (acc, { routeName, trainNum }) => ({
        ...acc,
        [routeName]: acc.hasOwnProperty(routeName)
          ? acc[routeName].add(trainNum)
          : (acc[routeName] = new Set([trainNum])),
      }),
      {} as Route,
    )

export const createStationList = (trains: Train[]): Station[] =>
  Object.values(
    trains
      .flatMap(t => t.stations)
      .reduce(
        (acc, { code, name, tz }) => ({
          ...acc,
          [code]: {
            code,
            name,
            tz,
          },
        }),
        {},
      )
  )

export const formatTrainResponse = (res: TrainResponse) => {
  const trains = Object.values(res).flat()
  return Object.values(trains)
  .map(route => ({
    ...route,
    createdAt: new Date(route.createdAt),
    updatedAt: new Date(route.createdAt),
    lastValTS: new Date(route.createdAt),
    stations: route.stations.map(formatStationResponse)
  }))
}

const formatStationResponse = (station: StationTrainRaw) => ({
  ...station,
  schArr: new Date(station.schArr),
  schDep: new Date(station.schDep),
  arr: new Date(station.arr),
  dep: new Date(station.dep),
})

export const getTrainId = (train: Train) =>
  `${train.routeName}_${train.trainNum}_${train.origCode}_${train.stations[0].schDep.valueOf()}`

export const getTrainStatus = (train: Train) => {
  const now = new Date()
  const { stations } = train
  const prevStation = stations.find(s => s.dep < now)
  const curStation = stations.find(s => s.arr < now && s.dep > now)
  const nextStation = stations.find(s => s.arr > now)
  const status: TrainStatus = {
    code: undefined,
    prevStation,
    curStation,
    nextStation,
    deviation: undefined,
    firstStation: stations[0],
    lastStation: stations[stations.length - 1]
  }
  if (!nextStation) {
    status.code = TimeStatus.COMPLETE
    return status
  }
  if (!prevStation && nextStation.code === stations[0].code) {
    status.code = TimeStatus.PREDEPARTURE
    return status
  }
  // else train is underway
  const station = curStation ?? prevStation
  if (!station) {
    return status // unkonwn status code
  }
  status.deviation = Math.round((station.arr.valueOf() - station.schArr.valueOf()) / 1000 / 60)
  status.code = status.deviation > 0 ? TimeStatus.DELAYED : TimeStatus.ON_TIME
  return status
}

export const findTrainsFromSegment = (trains: Train[], origCode: string, destCode: string) =>
  trains
    .filter(({ stations }) => {
      const origStationIndex = stations.findIndex(s => s.code === origCode)
      const destCodeIndex = stations.findIndex(s => s.code === destCode)
      return origStationIndex > -1 && destCodeIndex > -1 && origStationIndex < destCodeIndex
    })