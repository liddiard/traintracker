import type { MapRef } from 'react-map-gl/maplibre'
import { FeatureCollection, Point, Feature, Position } from 'geojson'
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { getTrainColor, getTrainStatus } from '../../utils'
import { Train, Station, TrainFeatureProperties, TrackId } from '../../types'
import { getExtrapolatedTrainPoint, snapTrainToTrack } from './calc'
import { sourceId, routeToCodeMap } from './constants'
import { point } from '@turf/turf'

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

type TrainPosition = {
  position: {
    point: Feature<Point>
    bearing?: number
    track?: TrackId
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
      ['concat', ['get', 'name'], ' (', ['get', 'code'], ')'],
    ],
    // font names from https://github.com/openmaptiles/fonts/
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 16],
    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    'text-radial-offset': 0.5,
    'text-justify': 'auto',
  },
  paint: {
    'text-color': colors['amtrak-blue-600'],
    'text-halo-color': 'white',
    'text-halo-width': 1,
    'text-halo-blur': 1,
  },
}

export const trainLabelLayer: SymbolLayerSpecification = {
  id: 'train-labels',
  type: 'symbol',
  source: sourceId.trains,
  layout: {
    'text-field': [
      'format',
      ['get', 'routeCode'],
      { 'text-color': ['case', ['get', 'isSelected'], 'white', 'black'] },
      ' ',
      ['get', 'trainNum'],
      {
        'text-color': [
          'case',
          ['get', 'isSelected'],
          'white',
          colors['amtrak-blue-500'],
        ],
      },
    ],
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 20],
    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 10, 1],
    'text-justify': 'auto',
    // font names from https://github.com/openmaptiles/fonts/
    'text-font': ['Noto Sans Bold'],
  },
  paint: {
    'text-halo-color': [
      'case',
      ['get', 'isSelected'],
      colors['amtrak-red-600'],
      'white',
    ],
    'text-halo-width': 10,
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
  map: MapRef,
  train: Train,
  stations: Station[],
  isSelected: boolean = false,
): Feature<Point, TrainFeatureProperties> => {
  const { objectID, trainNum, routeName, lon, lat } = train
  const trainStatus = getTrainStatus(train)
  const color = getTrainColor(trainStatus)

  // TODO: move below logic to its own function

  // calculating the train's last position snapped to the nearest track with the correct bearing
  // is computationally expensive, so we only want to do it when needed
  let lastTrainPosition
  // if the position is cached and the cache is still warm, use it
  if (
    trainSnapMap.hasOwnProperty(objectID) &&
    trainSnapMap[objectID].meta.updatedAt >= train.updatedAt
  ) {
    lastTrainPosition = trainSnapMap[objectID].position
  }
  // if the map is zoomed in enough that we care about showing the train
  // exactly on the track with bearing, and the train is in the current map
  // viewport, calculate its snapped position
  else if (map.getZoom() > 6 && map.getBounds().contains([lon, lat])) {
    console.log('Calculating new position for:', objectID)
    lastTrainPosition = snapTrainToTrack(
      train,
      stations,
      trainStatus.nextStation,
    )
    trainSnapMap[objectID] = {
      position: lastTrainPosition,
      meta: {
        updatedAt: train.updatedAt,
      },
    }
  }
  // train is outside the map viewport or we're zoomed far out; just return
  // its raw GPS position
  else {
    lastTrainPosition = {
      point: point([lon, lat]),
      bearing: undefined,
      track: undefined,
    }
  }
  // end TODO
  const {
    point: {
      geometry: { coordinates },
    },
    bearing,
    track,
  } = lastTrainPosition
  if (track) {
    const extrapolatedTrainPosition = getExtrapolatedTrainPoint(
      lastTrainPosition.point,
      track,
      trainStatus,
      stations,
    )
  }
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
      isSelected,
    },
  }
}

/**
 * Converts an array of trains into a GeoJSON FeatureCollection.
 *
 * @param map - A reference to the MapGL instance, used for calculating the
 *              bearing of the train.
 * @param trains - An array of train objects.
 * @param stations - An array of station objects, used to find the coordinates
 *                   of stations.
 * @param selectedTrain - The train that is currently selected, used to
 *                        highlight it on the map.
 * @returns A GeoJSON FeatureCollection representing the trains.
 */
export const trainsToGeoJson = (
  map: MapRef,
  trains: Train[] = [],
  stations: Station[] = [],
  selectedTrain?: Train,
): FeatureCollection<Point, TrainFeatureProperties> => ({
  type: 'FeatureCollection',
  features: trains.map((train) =>
    createTrainFeature(
      map,
      train,
      stations,
      train.objectID === selectedTrain?.objectID,
    ),
  ),
})
