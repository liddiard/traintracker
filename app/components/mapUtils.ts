import { GeoJSONSource, Map } from 'maplibre-gl'
import {
  point,
  nearestPointOnLine,
  bboxClip,
  bearing,
  explode,
  nearestPoint,
  distance,
  combine,
  lineSlice,
} from '@turf/turf'
import {
  FeatureCollection,
  Feature,
  MultiLineString,
  Point,
  LineString,
} from 'geojson'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '@/tailwind.config'
import { routeToCodeMap } from '../constants'
import { getTrainColor, getTrainStatus } from '../utils'
import { Train, StationTrain, TrainStatus, Station } from '../types'
import _amtrakTrack from '../../public/map_data/amtrak-track.geojson'

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
      .map((train) => {
        const { objectID, trainNum, routeName } = train
        const trainStatus = getTrainStatus(train)
        const color = getTrainColor(trainStatus)
        const { coordinates } = snapTrainToTrack(
          train,
          stations,
          trainStatus.nextStation,
        ).point.geometry
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
      }),
  })
}

/**
 * Determines if a given point is behind a train relative to the next station.
 *
 * @param pt - The point to check, represented as a GeoJSON Feature of type Point.
 * @param trainPosition - The current position of the train, represented as a GeoJSON Feature of type Point.
 * @param nextStation - The next station the train will arrive at, containing station information.
 * @returns A boolean indicating whether the point is behind the train relative to the next station, or undefined if unknown.
 */
const isPointBehindTrain = (
  pt: Feature<Point>,
  trainPosition: Feature<Point>,
  stations: Station[],
  nextStation?: StationTrain,
) => {
  const station = stations.find((s) => s.code === nextStation?.code)
  if (!station) {
    // console.warn(`Station not found: ${nextStation?.code}`)
    return
  }
  const stationPoint = point([station.lon, station.lat])
  const distanceBetweenTrainAndStation = distance(trainPosition, stationPoint)
  const distanceBetweenPointAndStation = distance(pt, stationPoint)
  return distanceBetweenPointAndStation > distanceBetweenTrainAndStation
}

/**
 * Calculates the bearing of a train relative to its nearest point on the track.
 * For bearing to be accurate, this function should only be used with
 * `trainPoints` that have been snapped to the track – i.e. precisely overlay
 * with a track LineString.
 *
 * @param trainPoint - The current position of the train as a GeoJSON Feature<Point>.
 * @param clippedTrack - The track geometry as a GeoJSON MultiLineString.
 * @param nextStation - The next station the train is heading towards (optional).
 * @returns The bearing in degrees, or undefined if the next station is not provided or if the nearest point is behind the train and cannot be determined.
 */
export const getBearing = (
  trainPoint: Feature<Point>,
  clippedTrack: MultiLineString,
  stations: Station[],
  nextStation?: StationTrain,
) => {
  // if no next station, we can't make the calculation
  if (!nextStation) {
    return
  }
  // find the nearest track vertex to the train
  const nearestPointOnTrack = nearestPoint(trainPoint, explode(clippedTrack))
  // check if the nearest track vertex is ahead of or behind the train
  const nearestPointIsBehindTrain = isPointBehindTrain(
    nearestPointOnTrack,
    trainPoint,
    stations,
    nextStation,
  )
  // return if we're unsure if the nearest point is behind the train (e.g. if
  // the station) code isn't found in the station data
  if (nearestPointIsBehindTrain === undefined) {
    return
  }
  // find the bearing between where the train is and its nearest point on its
  // track, flipping the bearing 180 degrees if the nearest track point is
  // behind the train
  return (
    bearing(trainPoint, nearestPointOnTrack) *
    (nearestPointIsBehindTrain ? -1 : 1)
  )
}

/**
 * Snaps a train's GPS-reported coordinates to the nearest point on a track,
 * along with bearing. If no track is near the train's coordinates, returns
 * the original coordinates without bearing.
 *
 * @param train - The train object containing GPS-reported coordinates.
 * @param nextStation - (Optional) The next station the train is heading to, used to calculate bearing.
 * @returns An object containing the snapped GeoJSON point and bearing.
 *
 * @example
 * const train = { lon: -122.4194, lat: 37.7749 };
 * const nextStation = { code: 'NYP' };
 * const result = snapTrainToRail(train, nextStation);
 * console.log(result.point); // Snapped point on the track
 * console.log(result.bearing); // Bearing to the next station
 */
export const snapTrainToTrack = (
  train: Train,
  stations: Station[],
  nextStation?: StationTrain,
) => {
  // find the Point on a track nearest the train's GPS-reported coordinates
  const { lon, lat } = train
  const trainPoint = point([lon, lat])

  // for performance, and to avoid snapping a train to track far away from its
  // actual coordinates, only consider track within a small bounding box
  // around the train's coordinates

  // corresponds to degress of lat/lon in each direction from the train's coordinates
  // 0.01 degrees is about 1 km: https://stackoverflow.com/a/16743805
  const bboxSize = 0.01

  const clippedTrack = combine({
    type: 'FeatureCollection',
    features: amtrakTrack.features
      .map((f) =>
        bboxClip(f, [
          lon - bboxSize,
          lat - bboxSize,
          lon + bboxSize,
          lat + bboxSize,
        ]),
      )
      // filter out track geometries that are empty after clipping (which will
      // be most of them for any given train)
      .filter((f) => f.geometry.coordinates.length),
  }).features[0]?.geometry as MultiLineString | undefined

  if (clippedTrack) {
    const snappedTrainPoint = nearestPointOnLine(clippedTrack, trainPoint)
    return {
      point: snappedTrainPoint,
      bearing: getBearing(
        snappedTrainPoint,
        clippedTrack,
        stations,
        nextStation,
      ),
    }
  } else {
    // if no track is near the train's GPS-reported position, we can't snap it
    // or calculate bearing, so just return the GPS-reported position
    return {
      point: trainPoint,
      bearing: undefined,
    }
  }
}

const getExtrapolatedTrainPoint = (
  map: Map,
  train: Train,
  trainStatus: TrainStatus,
) => {
  const { firstStation, lastStation, nextStation } = trainStatus
  const route = lineSlice(firstStation, lastStation, amtrakTrack)
  // lineSlice + along
}

const getTrainTrail = (map: Map, train: Train) => {
  // lineSlice + along
}
