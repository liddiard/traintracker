import { Map } from 'maplibre-gl'
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
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from 'geojson'
import { Train, StationTrain, TrainStatus, Station } from '../../types'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString
>

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
    console.warn(`isPointBehindTrain: Station not found: ${nextStation?.code}`)
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
  // track, flipping it 180 degrees if the nearest track point is behind the
  // train
  return (
    bearing(trainPoint, nearestPointOnTrack) +
    (nearestPointIsBehindTrain ? 180 : 0)
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
    // there is some track near the train's GPS-reported position, so find the
    // point on it nearest the train
    const snappedTrainPoint = nearestPointOnLine(clippedTrack, trainPoint)
    return {
      coordinates: snappedTrainPoint.geometry.coordinates,
      bearing: getBearing(
        snappedTrainPoint,
        clippedTrack,
        stations,
        nextStation,
      ),
    }
  } else {
    // there is no track is near the train's GPS-reported position, so we
    // can't snap it or calculate bearing – just return the GPS-reported
    // position
    return {
      coordinates: trainPoint.geometry.coordinates,
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
