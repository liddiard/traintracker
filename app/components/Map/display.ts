import { GeoJSONSource, Map, Marker } from 'maplibre-gl'
import {
  FeatureCollection,
  MultiLineString,
  Point,
  LineString,
  Feature,
  Position,
} from 'geojson'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { routeToCodeMap } from '../../constants'
import { getTrainColor, getTrainStatus } from '../../utils'
import { Train, Station } from '../../types'
import { snapTrainToTrack } from './calc'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'

// Import the raw text of the SVG file
// Two exclamation marks at the beginning disables the default SVG loader that
// would otherwise run first
// https://stackoverflow.com/a/35820113
import Pointer from '!!raw-loader!@/app/img/pointer.svg'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString
>

const {
  theme: { colors },
} = resolveConfig(tailwindConfig)

const sourceId = {
  amtrakTrack: 'amtrak-track',
  amtrakStations: 'amtrak-stations',
  trainLocations: 'train-locations',
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

export const renderTracks = (map: Map) => {
  map.addSource(sourceId.amtrakTrack, {
    type: 'geojson',
    data: amtrakTrack,
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

/**
 * Converts an array of stations into a GeoJSON FeatureCollection.
 *
 * @param {Station[]} stations - An array of station objects.
 * @returns {FeatureCollection<Point>} A GeoJSON FeatureCollection representing the stations.
 */
const stationsToGeoJson = (stations: Station[]): FeatureCollection<Point> => ({
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

export const renderStations = (map: Map, stations: Station[]) => {
  map.addSource(sourceId.amtrakStations, {
    type: 'geojson',
    data: stationsToGeoJson(stations),
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
  // map.addLayer({
  //   id: sourceId.trainLocations,
  //   type: 'circle',
  //   source: sourceId.trainLocations,
  //   paint: {
  //     'circle-color': ['get', 'color'],
  //     'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 12, 6],
  //     'circle-stroke-color': 'white',
  //     'circle-stroke-width': 1,
  //   },
  // })
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

const createTrainFeature = (
  train: Train,
  stations: Station[],
): Feature<Point> => {
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
  const { coordinates } = trainPosition
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
    },
  }
}

export const updateTrains = (
  map: Map,
  trains: Train[] = [],
  stations: Station[] = [],
) => {
  const trainSource = map.getSource(sourceId.trainLocations) as GeoJSONSource
  if (!trainSource) {
    return
  }
  trainSource.setData({
    type: 'FeatureCollection',
    features: trains
      .filter(({ lon, lat }) => map.getBounds().contains([lon, lat]))
      .map((train) => createTrainFeature(train, stations)),
  })
  trains.forEach(({ lon, lat }) => {
    const el = document.createElement('div')
    el.innerHTML = Pointer
    el.style.width = '20px'
    // https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MarkerOptions/#rotation
    new Marker({ element: el, rotationAlignment: 'map' })
      .setLngLat([lon, lat])
      .addTo(map)
  })
}
