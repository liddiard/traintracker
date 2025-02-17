import type { MapRef } from 'react-map-gl/maplibre'
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
  lineString,
  featureCollection,
  length,
  along,
} from '@turf/turf'
import {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Position,
} from 'geojson'
import {
  Train,
  StationTrain,
  TrainStatus,
  Station,
  TrackId,
  TrackFeatureProperties,
} from '../../types'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'
import { getArrival } from '@/app/utils'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString,
  TrackFeatureProperties
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
    return {}
  }
  // find the nearest track vertex to the train
  const nearestTrackPoint = nearestPoint(trainPoint, explode(clippedTrack))
  // check if the nearest track vertex is ahead of or behind the train
  const nearestPointIsBehindTrain = isPointBehindTrain(
    nearestTrackPoint,
    trainPoint,
    stations,
    nextStation,
  )
  // return if we're unsure if the nearest point is behind the train (e.g. if
  // the station) code isn't found in the station data
  if (nearestPointIsBehindTrain === undefined) {
    return {}
  }
  // find the bearing between where the train is and its nearest point on its
  // track, flipping it 180 degrees if the nearest track vertex is behind the
  // train
  return {
    bearing:
      bearing(trainPoint, nearestTrackPoint) +
      (nearestPointIsBehindTrain ? 180 : 0),
    nearestTrackPoint,
  }
}

/**
 * Finds the track associated with a given point feature.
 *
 * @param point - The track vertex to search for.
 * @param clippedTracks - An array of clipped track features to search within.
 * @returns If the point is found in a track, the track ID and index (if the point
 * is in a MultiLineString), otherwise undefined.
 */
const getTrackIdFromPoint = (
  point: Feature<Point>,
  clippedTracks: Feature<
    LineString | MultiLineString,
    TrackFeatureProperties
  >[],
): TrackId | undefined => {
  const [lon, lat] = point.geometry.coordinates
  // check if the exact lon/lat is found in the provided coordinate array
  const hasPoint = (coord: Position) => coord[0] === lon && coord[1] === lat
  for (const clippedTrack of clippedTracks) {
    // Track clipping can cause MultiLineStrings to be converted to
    // LineStrings, meaning we can't accurately determine where the point is
    // in the overall track geometry. Therefore, retrieve the full track
    // feature.
    const track = amtrakTrack.features.find(
      (f) => f.properties.OBJECTID === clippedTrack.properties.OBJECTID,
    )
    if (!track) {
      console.warn(
        `Unable to find full track from clipped track: ${clippedTrack}`,
      )
      continue
    }
    const id = track.properties.OBJECTID
    // if the feature is a `LineString` (an array of coordinates), loop through
    // it to look for the point
    if (track.geometry.type === 'LineString') {
      if (track.geometry.coordinates.some(hasPoint)) {
        return {
          id,
          index: undefined,
        }
      }
    }
    // if the feature is a `MultiLineString` (an array of arrays of coordinates),
    // loop through the nested geometry while tracking and returning the index
    // of the appropriate `LineString`
    else {
      for (let i = 0; i < track.geometry.coordinates.length; i++) {
        if (track.geometry.coordinates[i].some(hasPoint)) {
          return {
            id,
            index: i,
          }
        }
      }
    }
  }
  console.warn(`Unable to find track for point: ${point}`)
  return undefined
}

/**
 * Retrieves a track feature by its OBJECTID and index (if applicable).
 *
 * @param track - An object containing the OBJECTID and index (if applicable) of
 * the track to retrieve.
 * @param tracks - The FeatureCollection containing the track feature to
 * retrieve.
 * @returns The track feature as a LineString, or undefined if no track is
 * found.
 */
const getTrackFromId = (
  track: TrackId,
  tracks: FeatureCollection<
    LineString | MultiLineString,
    TrackFeatureProperties
  >,
) => {
  const trackFeature = tracks.features.find(
    (f) => f.properties.OBJECTID === track.id,
  )
  if (!trackFeature) {
    console.warn(`Unable to find track with id: ${track.id}`)
    return
  }
  // if the track is a LineString (an array of coordinates), use it directly
  // otherwise get the appropriate LineString from the MultiLineString
  const coordArr =
    track.index !== undefined
      ? (trackFeature.geometry.coordinates[track.index] as Position[])
      : (trackFeature.geometry.coordinates as Position[])
  return lineString(coordArr)
}

/**
 * Gets nearby track features and combines them into a single MultiLineString.
 *
 * @param point - Feature representing a point with coordinates.
 * @param track - FeatureCollection containing LineString or MultiLineString features with track properties.
 * @returns An object containing the nearby track features and the combined MultiLineString geometry.
 */
const getNearbyTrack = (
  point: Feature<Point>,
  track: FeatureCollection<
    LineString | MultiLineString,
    TrackFeatureProperties
  >,
) => {
  const [lon, lat] = point.geometry.coordinates
  // corresponds to degrees of lat/lon in each cardinal direction from the
  // train's coordinates
  // 0.01 degrees is about 1 km: https://stackoverflow.com/a/16743805
  const bboxSize = 0.01
  // clip the track features to a bounding box around the point's coordinates
  const nearbyFeatures = track.features
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
    .filter((f) => f.geometry.coordinates.length) as Feature<
    LineString | MultiLineString,
    TrackFeatureProperties
  >[]

  // combine the clipped features into a single MultiLineString which can be
  // passed to `turf.nearestPointOnLine`
  // `combine` appears to always return a FeatureCollection with a single
  // feature, so we can just consider index 0
  const nearbyTrack = combine(featureCollection(nearbyFeatures)).features[0]
    ?.geometry as MultiLineString | undefined

  return {
    nearbyFeatures,
    nearbyTrack,
  }
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
  const { nearbyFeatures, nearbyTrack } = getNearbyTrack(
    trainPoint,
    amtrakTrack,
  )

  if (nearbyTrack) {
    // there is some track near the train's GPS-reported position, so find the
    // point on that track nearest the train
    const snappedTrainPoint = nearestPointOnLine(nearbyTrack, trainPoint)
    // get the train's bearing and track vertex nearest it
    const { bearing, nearestTrackPoint } = getBearing(
      snappedTrainPoint,
      nearbyTrack,
      stations,
      nextStation,
    )
    let track
    // if we were able to find a track vertex near the train, find the track
    // to which the vertex corresponds
    if (nearestTrackPoint) {
      track = getTrackIdFromPoint(nearestTrackPoint, nearbyFeatures)
    }
    return {
      point: snappedTrainPoint,
      bearing,
      track,
    }
  } else {
    // there is no track is near the train's GPS-reported position, so we
    // can't snap it or calculate bearing – just return the GPS-reported
    // position
    return {
      point: trainPoint,
      bearing: undefined,
      track: undefined,
    }
  }
}

/**
 * Extrapolates a train's position based on its last-reported position and
 * estimated speed.
 *
 * @param trainPoint - The last-reported position of the train as a GeoJSON Feature of type Point.
 * @param track - The track on which the train is traveling, represented as a TrackId.
 * @param trainStatus - The status of the train, containing information about its next station and estimated arrival time.
 * @param stations - An array of station objects, used to find the coordinates of the next station.
 * @returns The extrapolated position of the train as a GeoJSON Feature of type Point, or undefined if unable to calculate.
 *
 * @example
 * const train = {
 *   type: 'Feature',
 *   geometry: {
 *     type: 'Point',
 *     coordinates: [-122.4194, 37.7749],
 *   }
 * }
 * const trainStatus = {
 *   nextStation: 'NYP',
 *   updatedAt: new Date(),
 *   ...
 * }
 * const stations = [
 *   { code: 'NYP', lon: -74.0060, lat: 40.7128, ... },
 *   ...
 * ];
 * const result = getExtrapolatedTrainPoint(
 *   train,
 *   { id: 'track-id', index: 0 },
 *   trainStatus,
 *   stations,
 * );
 * console.log(result); // Extrapolated position of the train
 *
 * @description
 * We're going to create a line segment between the train's last reported
 * position and its next station:
 *
 * |---------------X-------------------------------------------------|
 * ↑                                                                 ↑
 * train position + timestamp              next station + est. arrival
 *
 * We know the train should be somewhere between its last known position and
 * the next station.¹ That extrapolated position is represented by "X" above
 * and is what this function solves for.
 *
 * Relevant to consider are:
 * - time elapsed since last update
 * - train's assumed speed, based on:
 *   - distance to cover
 *   - time between expected arrival and last update
 *
 * Calculations:
 * Speed [km/ms]          = distance / (estArrival - lastUpdate)
 * TimeElapsed [ms]       = now - lastUpdate
 * EstimatedDistance [km] = Speed * TimeElapsed
 *
 * 1: Assuming we haven't passed the next station's arrival time, but by the
 * way "next station" is determined, it's guaranteed to be in the future.
 */
export const getExtrapolatedTrainPoint = (
  trainPoint: Feature<Point>,
  track: TrackId,
  trainStatus: TrainStatus,
  stations: Station[],
) => {
  const { nextStation } = trainStatus
  const station = stations.find((s) => s.code === nextStation?.code)
  const trackLine = getTrackFromId(track, amtrakTrack)
  if (!station || !trackLine) {
    return
  }
  // find the track segment between the train's last-reported position and the
  // next station
  const trackSegment = lineSlice(
    trainPoint.geometry.coordinates,
    [station.lon, station.lat],
    trackLine,
  )

  // remaining distance to cover from the last reported position
  const distanceRemaining = length(trackSegment)
  const currentTime = new Date()
  // expected arrival at the next station
  const arrivalTime = getArrival(nextStation!)
  const lastUpdate = trainStatus.updatedAt

  // how fast the train must be going to arrive at the next station at the
  // estimated time
  const assumedSpeed =
    distanceRemaining / (arrivalTime.getTime() - lastUpdate.getTime())
  const timeSinceLastUpdate = currentTime.getTime() - lastUpdate.getTime()
  // estimated distance covered, based on assumed speed and time since last update
  const distanceCovered = assumedSpeed * timeSinceLastUpdate
  return along(trackSegment, distanceCovered)
}

const getTrainTrail = (map: MapRef, train: Train) => {
  // lineSlice + along
}
