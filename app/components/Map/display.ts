import type { LngLatLike, MapRef } from 'react-map-gl/maplibre'
import { FeatureCollection, Point, Feature } from 'geojson'
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'react-map-gl/maplibre'
import {
  formatDuration,
  getTrainColor,
  getTrainMeta,
  getTrainShortcode,
} from '../../utils'
import { Train, Station, TrainFeatureProperties } from '../../types'
import { getExtrapolatedTrainPoint } from './calc'
import { sourceId, routeToCodeMap, DETAIL_ZOOM_LEVEL } from './constants'

// Necessary to use hardcoded colors because during SSR, CSS variables aren't
// available, and in 404 routes only server-side rendering runs (so CSS vars never
// become available).
// Should match values in @/app/globals.css
const colors = {
  amtrakBlue400: '#298bb3',
  amtrakBlue500: '#006d93',
  viaRed: '#ea212e',
  brightlineYellow: '#997f00',
}

export const trackLayer: LineLayerSpecification = {
  id: sourceId.track,
  type: 'line',
  source: sourceId.track,
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': [
      'match',
      ['get', 'agency'],
      'via',
      colors.viaRed,
      'brightline',
      colors.brightlineYellow,
      colors.amtrakBlue400,
    ],
    'line-width': 2,
  },
}

export const stationLayer: CircleLayerSpecification = {
  id: sourceId.stations,
  type: 'circle',
  source: sourceId.stations,
  paint: {
    'circle-color': 'white',
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 4],
    'circle-stroke-color': [
      'match',
      ['get', 'agency'],
      'via',
      colors.viaRed,
      'brightline',
      colors.brightlineYellow,
      colors.amtrakBlue400,
    ],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0, 8, 2],
  },
}

export const stationLabelLayer: SymbolLayerSpecification = {
  id: sourceId.stationLabels,
  type: 'symbol',
  source: sourceId.stations,
  minzoom: 6,
  layout: {
    'text-field': [
      'step',
      ['zoom'],
      ['get', 'code'],
      10,
      ['concat', ['get', 'code'], ' / ', ['get', 'name']],
    ],
    // font names from https://github.com/openmaptiles/fonts/
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 12, 16],
    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    'text-radial-offset': 0.5,
    'text-justify': 'auto',
  },
  paint: {
    'text-color': [
      'match',
      ['get', 'agency'],
      'via',
      colors.viaRed,
      'brightline',
      colors.brightlineYellow,
      colors.amtrakBlue400,
    ],
    'text-halo-color': 'white',
    'text-halo-width': 1,
    'text-halo-blur': 1,
  },
}

export const trainGPSLabelLayer: SymbolLayerSpecification = {
  id: sourceId.trainGPS,
  type: 'symbol',
  source: sourceId.trainGPS,
  minzoom: DETAIL_ZOOM_LEVEL,
  layout: {
    'text-field': ['get', 'lastUpdatedStr'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 8, 10, 14],
    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 5, 0.75, 10, 1],
    'text-justify': 'auto',
    // font names from https://github.com/openmaptiles/fonts/
    'text-font': ['Noto Sans Regular'],
  },
  paint: {
    'text-color': colors.amtrakBlue500,
    'text-halo-color': 'white',
    'text-halo-width': 1,
    'text-halo-blur': 1,
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
      coordinates: station.coordinates!,
    },
    properties: {
      ...station,
    },
  })),
})

/**
 * Creates a GeoJSON Feature representing a train on the map.
 *
 * @param {Feature<Point, TrainFeatureProperties> | undefined} prevTrain - The existing feature for this train, if any
 * @param {MapRef} map - Reference to the map instance
 * @param {Train} train - The train data to display
 * @param {Station[]} stations - Array of station data for calculating extrapolated train position
 * @returns {Feature<Point, TrainFeatureProperties>} A GeoJSON Feature representing the train
 *
 * @description
 * This function creates a GeoJSON Feature for rendering a train on the map.
 * When zoomed in (zoom >= DETAIL_ZOOM_LEVEL) and the train is in view, it snaps the
 * train to the nearest track and extrapolates the position based on its status and
 * schedule. Otherwise, it uses the raw GPS coordinates. The function also determines
 * the train's color based on its status and includes properties needed for rendering.
 */
const createTrainFeature = (
  prevTrain: Feature<Point, TrainFeatureProperties> | undefined,
  map: MapRef | undefined,
  train: Train,
  stations: Station[],
): Feature<Point, TrainFeatureProperties> => {
  const { id, number, name, updated, speed, track } = train
  const agency = id.split('/')[0]
  const trainMeta = getTrainMeta(train)
  const color = getTrainColor(trainMeta)
  // existing coordinates for this train (which may have previously been
  // snapped/extrapolated by this function), otherwise use raw GPS coordinates
  const prevCoords = prevTrain?.geometry.coordinates ?? train.coordinates

  let coordinates, heading, isExtrapolated
  // if the map is zoomed in enough that we care about showing the train
  // exactly on the track with heading, and the train is in the current map
  // viewport, calculate its snapped position
  if (
    map &&
    map.getZoom() >= DETAIL_ZOOM_LEVEL &&
    map.getBounds().contains(prevCoords as LngLatLike)
  ) {
    // if we've identified a track for this train, extrapolate its current
    // position along it based on last update and next station ETA
    const extrapolated = track
      ? getExtrapolatedTrainPoint(
          train.coordinates!,
          { id: track, agency },
          trainMeta,
          stations,
        )
      : null
    coordinates = extrapolated?.point.geometry.coordinates ?? prevCoords
    heading = extrapolated?.heading
    isExtrapolated = !!extrapolated
  }
  // train is outside the map viewport or we're zoomed far out; just return
  // its raw GPS position
  else {
    coordinates = prevCoords
    isExtrapolated = false
  }

  // detect if GPS coordinates changed (new data from API)
  const gpsChanged = prevTrain
    ? prevTrain.properties.gpsCoordinates?.[0] !== train.coordinates?.[0] ||
      prevTrain.properties.gpsCoordinates?.[1] !== train.coordinates?.[1]
    : false

  // detect if rendering mode changed (GPS position → extrapolated or vice versa)
  const wasExtrapolated = prevTrain?.properties.isExtrapolated ?? false
  const modeChanged = prevTrain ? wasExtrapolated !== isExtrapolated : false

  // skip marker animation on first render, GPS update, or mode switch
  const skipAnimation = !prevTrain || gpsChanged || modeChanged

  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      coordinates: coordinates!,
    },
    properties: {
      id,
      number,
      name: routeToCodeMap[name],
      shortcode: getTrainShortcode(train),
      color,
      heading: heading ?? null,
      updated,
      speed,
      gpsCoordinates: train.coordinates,
      lastUpdatedStr: updated
        ? formatDuration((updated.getTime() - new Date().getTime()) / 60000, {
            shortenMins: true,
          })
        : '',
      isExtrapolated,
      skipAnimation,
      track,
    },
  }
}

/**
 * Converts an array of trains into a GeoJSON FeatureCollection.
 *
 * @param prevTrains -
 * @param map - A reference to the MapGL instance, used for calculating the
 *              heading of the train.
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
): FeatureCollection<Point, TrainFeatureProperties> => ({
  type: 'FeatureCollection',
  features: trains
    // exclude trains without GPS coordinates
    .filter((train) => train.coordinates)
    .map((train) =>
      createTrainFeature(
        prevTrains.features.find((f) => f.properties.id === train.id),
        map,
        train,
        stations,
      ),
    ),
})
