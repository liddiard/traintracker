import { StationRaw, TrainResponse } from './types'

export const createTrainNumMap = (res) =>
  Object.values(res)
    .flat()
    .reduce(
      (acc, { routeName, trainNum }) => ({
        ...acc,
        [routeName]: acc.hasOwnProperty(routeName)
          ? acc[routeName].add(trainNum)
          : (acc[routeName] = new Set([trainNum])),
      }),
      {},
    );

export const createStationCodeMetadataMap = (res) =>
  Object.values(res)
    .flat()
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
    );

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

const formatStationResponse = (station: StationRaw) => ({
  ...station,
  schArr: new Date(station.schArr),
  schDep: new Date(station.schDep),
  arr: new Date(station.arr),
  dep: new Date(station.dep),
})
