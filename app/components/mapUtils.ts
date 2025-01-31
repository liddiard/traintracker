import { GeoJSONSource, Map } from 'maplibre-gl'
import {
  point,
  nearestPointOnLine,
  nearestPoint,
  bearing,
  distance,
} from '@turf/turf'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { routeToCodeMap } from '../constants'
import { getTrainColor, getTrainStatus } from '../utils'
import { Train, StationTrain } from '../types'

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

const sourceId = {
  amtrakTrack: 'amtrak-track',
  amtrakStations: 'amtrak-stations',
  trainLocations: 'train-locations',
}

export const renderTracks = (map: Map) => {
  map.addSource(sourceId.amtrakTrack, {
    type: 'geojson',
    data: '/amtrak-geojson/amtrak-track.geojson',
  })
  map.addLayer({
    id: sourceId.amtrakTrack,
    type: 'line',
    source: sourceId.amtrakTrack,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': colors['amtrak-blue-500'],
      'line-width': 2,
    },
  })
}

export const renderStations = (map: Map) => {
  map.addSource(sourceId.amtrakStations, {
    type: 'geojson',
    data: '/amtrak-geojson/amtrak-stations.geojson',
  })
  map.addLayer({
    id: sourceId.amtrakStations,
    type: 'circle',
    source: sourceId.amtrakStations,
    paint: {
      'circle-color': 'white',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 4],
      'circle-stroke-color': colors['amtrak-blue-500'],
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 2],
    },
  })
  map.addLayer({
    id: 'station-labels',
    type: 'symbol',
    source: sourceId.amtrakStations,
    layout: {
      'text-field': [
        'step',
        ['zoom'],
        '',
        5,
        ['get', 'STNCODE'],
        9,
        ['get', 'STNNAME'],
      ],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 16],
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
    },
    paint: {
      'text-color': colors['amtrak-blue-600'],
      'text-halo-color': 'white',
      'text-halo-width': 1,
    },
  })
}

export const renderTrains = (map: Map) => {
  map.addSource(sourceId.trainLocations, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  })
  map.addLayer({
    id: sourceId.trainLocations,
    type: 'circle',
    source: sourceId.trainLocations,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 12, 6],
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
    },
  })
  map.addLayer({
    id: 'train-labels',
    type: 'symbol',
    source: sourceId.trainLocations,
    layout: {
      'text-field': [
        'format',
        ['get', 'routeCode'],
        { 'text-color': 'black' },
        ' ',
        ['get', 'trainNum'],
        { 'text-color': colors['amtrak-blue-600'] },
      ],
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 20],
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      // font names from https://github.com/openmaptiles/fonts/
      'text-font': ['Noto Sans Bold'],
    },
    paint: {
      'text-halo-color': 'white',
      'text-halo-width': 4,
    },
  })
}

export const updateTrains = (map: Map, trains: Train[]) => {
  const trainSource = map.getSource(sourceId.trainLocations) as GeoJSONSource
  if (!trainSource) {
    return
  }
  trainSource.setData({
    type: 'FeatureCollection',
    features: trains?.map((train) => {
      const { lon, lat, objectID, trainNum, routeName } = train
      const trainStatus = getTrainStatus(train)
      const color = getTrainColor(trainStatus)
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          objectID,
          trainNum,
          color,
          routeCode: routeToCodeMap[routeName],
        },
      }
    }),
  })
}

const isPointBehindTrain = (
  map: Map,
  point: Point,
  trainPosition,
  nextStation,
) => {
  const stations = map.getSource(sourceId.amtrakStations)?.serialize()
  const stationCoords = stations.features.find(
    (f) => f.properties.STNCODE === nextStation.code,
  ).geometry.coordinates
  const stationPoint = point(stationCoords)
  const distanceBetweenTrainAndStation = distance(trainPosition, stationPoint)
  const distanceBetweenPointAndStation = distance(point, stationPoint)
  return distanceBetweenPointAndStation > distanceBetweenTrainAndStation
}

export const snapTrainToRail = (
  map: Map,
  train: Train,
  nextStation: StationTrain,
) => {
  const tracks = map.getSource(sourceId.amtrakTrack)?.serialize()
  const { lon, lat } = train
  const trainPosition = point([lon, lat])
  // find the lat/lon that's on a track nearest the train GPS coordinates
  const nearestCoordOnTrack = nearestPointOnLine(tracks, trainPosition)
  // find the nearest "vertex" (point) on the track from previous coord
  // note: this point could be ahead of or behind the train's direction of
  // travel
  const nearestPointOnTrack = nearestPoint(nearestCoordOnTrack, tracks)
  const nearestPointIsBehindTrain = isPointBehindTrain(
    map,
    nearestPointOnTrack,
    trainPosition,
    nextStation,
  )
  const multiplier = nearestPointIsBehindTrain ? -1 : 1
  // find the bearing between the two
  const trainBearing =
    bearing(nearestCoordOnTrack, nearestPointOnTrack) * multiplier
  return {
    position: trainPosition,
    bearing: trainBearing,
  }
}
