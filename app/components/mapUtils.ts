import maplibregl, { GeoJSONSource, Map } from 'maplibre-gl'
import { Train } from '../types'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { routeToCodeMap } from '../constants'

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

export const renderTracks = (map: Map) => {
  map.addSource('amtrak-track', {
    type: 'geojson',
    data: '/amtrak-track.geojson',
  })
  map.addLayer({
    id: 'amtrak-track',
    type: 'line',
    source: 'amtrak-track',
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
  map.addSource('amtrak-stations', {
    type: 'geojson',
    data: '/amtrak-stations.geojson',
  })
  map.addLayer({
    id: 'amtrak-stations',
    type: 'circle',
    source: 'amtrak-stations',
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
    source: 'amtrak-stations',
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
  map.addSource('train-locations', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  })
  map.addLayer({
    id: 'train-locations',
    type: 'circle',
    source: 'train-locations',
    paint: {
      'circle-color': colors['amtrak-red-500'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 12, 6],
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
    },
  })
  map.addLayer({
    id: 'train-labels',
    type: 'symbol',
    source: 'train-locations',
    layout: {
      // https://maplibre.org/maplibre-gl-js/docs/examples/display-and-style-rich-text-labels/
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
  const trainSource = map.getSource('train-locations') as GeoJSONSource
  if (!trainSource) {
    return
  }
  trainSource.setData({
    type: 'FeatureCollection',
    features: trains?.map(({ lon, lat, objectID, routeName, trainNum }) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        objectID,
        trainNum,
        routeCode: routeToCodeMap[routeName],
      },
    })),
  })
}
