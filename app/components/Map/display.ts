import type { LngLatLike, MapRef } from 'react-map-gl/maplibre'
import { FeatureCollection, Point, Feature } from 'geojson'
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import {
  createCachedFunction,
  getTrainColor,
  getTrainStatus,
} from '../../utils'
import { Train, Station, TrainFeatureProperties } from '../../types'
import { getExtrapolatedTrainPoint, snapTrainToTrack } from './calc'
import { sourceId, routeToCodeMap } from './constants'

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

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

const snapTrainToTrackCached = createCachedFunction(
  snapTrainToTrack,
  (train) => train.objectID, // cache key
  // cache validity condition
  ({ updatedAt }, train) => !!updatedAt && updatedAt === train.updatedAt,
)

/**
 * Creates a GeoJSON Feature representing a train on the map.
 *
 * @param {Feature<Point, TrainFeatureProperties> | undefined} prevTrain - The existing feature for this train, if any
 * @param {MapRef} map - Reference to the map instance
 * @param {Train} train - The train data to display
 * @param {Station[]} stations - Array of station data for calculating extrapolated train position
 * @param {boolean} [isSelected=false] - Whether this train is currently selected by the user
 * @returns {Feature<Point, TrainFeatureProperties>} A GeoJSON Feature representing the train
 *
 * @description
 * This function creates a GeoJSON Feature for rendering a train on the map.
 * When zoomed in (zoom > 6) and the train is in view, it snaps the train to the nearest track
 * and extrapolates the position based on its status and schedule. Otherwise, it uses
 * the raw GPS coordinates. The function also determines the train's color based on its status
 * and includes properties needed for rendering.
 */
const createTrainFeature = (
  prevTrain: Feature<Point, TrainFeatureProperties> | undefined,
  map: MapRef,
  train: Train,
  stations: Station[],
  isSelected: boolean = false,
): Feature<Point, TrainFeatureProperties> => {
  const { objectID, trainNum, routeName, lon, lat } = train
  const trainStatus = getTrainStatus(train)
  const color = getTrainColor(trainStatus)
  // existing coordinates for this train (which may have previously been
  // snapped/extrapolated by this function), otherwise use raw GPS coordinates
  const prevCoords = prevTrain?.geometry.coordinates ?? [lon, lat]

  let coordinates, bearing
  // if the map is zoomed in enough that we care about showing the train
  // exactly on the track with bearing, and the train is in the current map
  // viewport, calculate its snapped position
  if (map.getZoom() > 6 && map.getBounds().contains(prevCoords as LngLatLike)) {
    // get the last received (snapped) GPS position of the train + bearing
    const lastPosition = snapTrainToTrackCached(train)
    const { track } = lastPosition
    // if we've identified a track for this train, extrapolate its current
    // position along it based on last update and next station ETA
    const extrapolated =
      track && getExtrapolatedTrainPoint(track, trainStatus, stations)
    coordinates =
      extrapolated?.point.geometry.coordinates ??
      lastPosition.point.geometry.coordinates
    bearing = extrapolated?.bearing
  }
  // train is outside the map viewport or we're zoomed far out; just return
  // its raw GPS position
  else {
    coordinates = prevCoords
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
 * @param prevTrains -
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
  prevTrains: FeatureCollection<Point, TrainFeatureProperties>,
  map: MapRef,
  trains: Train[] = [],
  stations: Station[] = [],
  selectedTrain?: Train,
): FeatureCollection<Point, TrainFeatureProperties> => ({
  type: 'FeatureCollection',
  features: trains.map((train) =>
    createTrainFeature(
      prevTrains.features.find((f) => f.properties.objectID === train.objectID),
      map,
      train,
      stations,
      train.objectID === selectedTrain?.objectID,
    ),
  ),
})
