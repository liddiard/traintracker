import type { MapRef } from 'react-map-gl/maplibre'
import { FeatureCollection, Point, Feature, Position } from 'geojson'
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { routeToCodeMap } from '../../constants'
import { getTrainColor, getTrainStatus } from '../../utils'
import { Train, Station, TrainFeatureProperties } from '../../types'
import { snapTrainToTrack } from './calc'

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

const sourceId = {
  amtrakTrack: 'amtrak-track',
  amtrakStations: 'amtrak-stations',
  trainLocations: 'trains',
}

type TrainPosition = {
  position: {
    coordinates: Position
    bearing?: number
  }
  meta: {
    updatedAt: Date
  }
}
const trainSnapMap: Record<string, TrainPosition> = {}

export const trackLayer: LineLayerSpecification = {
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
}

export const stationLayer: CircleLayerSpecification = {
  id: sourceId.amtrakStations,
  type: 'circle',
  source: sourceId.amtrakStations,
  paint: {
    'circle-color': 'white',
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 4],
    'circle-stroke-color': colors['amtrak-blue-500'],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 2],
  },
}

export const stationLabelLayer: SymbolLayerSpecification = {
  id: 'station-labels',
  type: 'symbol',
  source: sourceId.amtrakStations,
  layout: {
    'text-field': [
      'step',
      ['zoom'],
      '',
      5,
      ['get', 'code'],
      10,
      ['get', 'name'],
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
}

export const trainLayer: CircleLayerSpecification = {
  id: sourceId.trainLocations,
  type: 'circle',
  source: sourceId.trainLocations,
  paint: {
    'circle-color': ['get', 'color'],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 12, 6],
    'circle-stroke-color': 'white',
    'circle-stroke-width': 1,
  },
}

export const trainLabelLayer: SymbolLayerSpecification = {
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
}

/**
 * Converts an array of stations into a GeoJSON FeatureCollection.
 *
 * @param {Station[]} stations - An array of station objects.
 * @returns {FeatureCollection<Point>} A GeoJSON FeatureCollection representing the stations.
 */
export const stationsToGeoJson = (
  stations: Station[],
): FeatureCollection<Point> => ({
  type: 'FeatureCollection',
  features: stations.map((station) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [station.lon, station.lat],
    },
    properties: {
      ...station,
    },
  })),
})

const createTrainFeature = (
  train: Train,
  stations: Station[],
): Feature<Point, TrainFeatureProperties> => {
  const { objectID, trainNum, routeName } = train
  const trainStatus = getTrainStatus(train)
  const color = getTrainColor(trainStatus)
  let trainPosition
  if (
    trainSnapMap.hasOwnProperty(objectID) &&
    trainSnapMap[objectID].meta.updatedAt >= train.updatedAt
  ) {
    trainPosition = trainSnapMap[objectID].position
  } else {
    console.log('Calculating new position for:', objectID)
    trainPosition = snapTrainToTrack(train, stations, trainStatus.nextStation)
    trainSnapMap[objectID] = {
      position: trainPosition,
      meta: {
        updatedAt: train.updatedAt,
      },
    }
  }
  const { coordinates, bearing } = trainPosition
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties: {
      objectID,
      trainNum,
      color,
      routeCode: routeToCodeMap[routeName],
      bearing,
    },
  }
}

export const trainsToGeoJson = (
  map: MapRef,
  trains: Train[] = [],
  stations: Station[] = [],
): FeatureCollection<Point, TrainFeatureProperties> => ({
  type: 'FeatureCollection',
  features: trains
    .filter(({ lon, lat }) => map.getBounds().contains([lon, lat]))
    .map((train) => createTrainFeature(train, stations)),
})
