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
  cleanCoords,
  pointToLineDistance,
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
  TrainMeta,
  Station,
  TrackId,
  TrackFeatureProperties,
  TimeStatus,
  Stop,
} from '../../types'
import _amtrakTrack from '@/public/map_data/amtrak-track.json'
import { createCachedFunction, getStationCoordinates } from '@/app/utils'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString,
  TrackFeatureProperties
>

/**
 * Determines if a given point is behind a train relative to the next station.
 *
 * @param pt - The point to check, represented as a GeoJSON Feature of type Point.
 * @param trainPosition - The current position of the train, represented as a GeoJSON Feature of type Point.
 * @param nextStop - The next station the train will arrive at, containing station information.
 * @returns A boolean indicating whether the point is behind the train relative to the next station, or undefined if unknown.
 */
const isPointBehindTrain = (
  pt: Feature<Point>,
  trainPosition: Feature<Point>,
  stations: Station[],
  nextStop?: Stop,
) => {
  const station = stations.find((s) => s.code === nextStop?.code)
  if (!station?.coordinates) {
    console.warn(
      `isPointBehindTrain: Station coordinates not found: ${nextStop?.code}`,
    )
    return
  }
  const stationPoint = point(station.coordinates)
  const distanceBetweenTrainAndStation = distance(trainPosition, stationPoint)
  const distanceBetweenPointAndStation = distance(pt, stationPoint)
  return distanceBetweenPointAndStation > distanceBetweenTrainAndStation
}

/**
 * Normalizes an angle in degrees to be within the range [0, 360).
 *
 * @param degree - The input angle in degrees, which can be any number (positive or negative).
 * @returns The normalized angle within the range of 0 (inclusive) to 360 (exclusive).
 *
 * @example
 * normalizeBearing(370);   // Returns 10
 * normalizeBearing(-10);   // Returns 350
 * normalizeBearing(180);   // Returns 180 (already normalized)
 */
const normalizeBearing = (degree: number) => {
  // Normalize the degree to be within 0 and 360
  let normalizedDegree = degree % 360

  // If the result is negative, convert it to its positive equivalent
  if (normalizedDegree < 0) {
    normalizedDegree += 360
  }

  return normalizedDegree
}

/**
 * Calculates the bearing of a train relative to its nearest point on the track.
 * For bearing to be accurate, this function should only be used with
 * `trainPoints` that have been snapped to the track – i.e. precisely overlay
 * with a track LineString.
 *
 * @param trainPoint - The current position of the train as a GeoJSON Feature<Point>.
 * @param track - The track geometry as a GeoJSON MultiLineString.
 * @param nextStop - The next station the train is heading towards (optional).
 * @returns The bearing in degrees, or undefined if the next station is not provided or if the nearest point is behind the train and cannot be determined.
 */
export const getBearing = (
  trainPoint: Feature<Point>,
  track: MultiLineString | LineString,
  stations: Station[],
  nextStop?: Stop,
) => {
  // if no next station, we can't make the calculation
  if (!nextStop) {
    return
  }
  const trainPointJSON = JSON.stringify(trainPoint.geometry.coordinates)
  // get all track points except the one the train is on
  const trackPointsExcludingTrainPoint = explode(track).features.filter(
    (pt) => JSON.stringify(pt.geometry.coordinates) !== trainPointJSON,
  )
  if (!trackPointsExcludingTrainPoint.length) {
    return
  }
  // find the nearest track vertex to the train
  const nearestTrackPoint = nearestPoint(
    trainPoint,
    featureCollection(trackPointsExcludingTrainPoint),
  )
  // check if the nearest track vertex is ahead of or behind the train
  const nearestPointIsBehindTrain = isPointBehindTrain(
    nearestTrackPoint,
    trainPoint,
    stations,
    nextStop,
  )
  // return if we're unsure if the nearest point is behind the train (e.g. if
  // the station) code isn't found in the station data
  if (nearestPointIsBehindTrain === undefined) {
    return
  }
  // find the bearing between where the train is and its nearest point on its
  // track, flipping it 180 degrees if the nearest track vertex is behind the
  // train
  const rawBearing =
    bearing(trainPoint, nearestTrackPoint) +
    (nearestPointIsBehindTrain ? 180 : 0)
  // normalize the bearing to be within 0 and 360
  const normalizedBearing = normalizeBearing(rawBearing)
  return normalizedBearing
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
        'Unable to find full track from clipped track:',
        clippedTrack,
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
  console.warn('Unable to find track for point:', point)
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
 * Snaps a train's GPS-reported coordinates to the nearest point on a track.
 * If no track is near the train's coordinates, returns the original coordinates.
 *
 * @param train - The train object containing GPS-reported coordinates.
 * @returns The snapped GeoJSON point.
 *
 * @example
 * const train = { lon: -122.4194, lat: 37.7749 };
 * const nextStop = { code: 'NYP' };
 * const result = snapTrainToTrack(train);
 * console.log(result); // Snapped point on the track
 */
export const snapTrainToTrack = (train: Train) => {
  // find the Point on a track nearest the train's GPS-reported coordinates
  const { coordinates, updated } = train
  if (!coordinates) {
    return {}
  }

  const trainPoint = point(coordinates)
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
    // get the vertex on the track geometry that's nearest the train
    const nearestTrackPoint = nearestPoint(trainPoint, explode(nearbyTrack))
    let track
    // if we were able to find a track vertex near the train, find the track
    // to which the vertex corresponds
    if (nearestTrackPoint) {
      track = getTrackIdFromPoint(nearestTrackPoint, nearbyFeatures)
    }
    return {
      point: snappedTrainPoint,
      track,
      updated,
    }
  } else {
    // there is no track is near the train's GPS-reported position, so we
    // can't snap it or calculate bearing – just return the GPS-reported
    // position
    return {
      point: trainPoint,
      track: undefined,
      updated,
    }
  }
}

/**
 * Cached version of snapTrainToTrack.
 */
export const snapTrainToTrackCached = createCachedFunction(
  snapTrainToTrack,
  (train) => train.id, // cache key
  // cache validity condition
  ({ updated }, train) => !!updated && updated === train.updated,
)

/**
 * Gets the track segment between a train's position and the next station.
 *
 * @param stationCode - Station identifier to be used as a cache key
 * @param trainPoint - The last-reported position of the train
 * @param trackLine - The GeoJSON track line
 * @param stationCoords - The coordinates of the next station
 * @returns The track segment as a GeoJSON Feature of type LineString
 */
const getTrackSegment = (
  stationCode: string,
  start: Position,
  end: Position,
  trackLine: Feature<LineString>,
) => {
  // Calculate track segment
  const trackSegment = lineSlice(start, end, trackLine)

  // Ensure segment is in the correct direction
  const firstPointInSegment = trackSegment.geometry.coordinates[0]
  const segmentIsBackwards =
    distance(firstPointInSegment, start) > distance(firstPointInSegment, end)

  if (segmentIsBackwards) {
    trackSegment.geometry.coordinates.reverse()
  }

  return {
    track: trackSegment,
    length: length(trackSegment),
    start,
    end,
  }
}

/**
 * Cached version of getTrackSegment.
 */
const getTrackSegmentCached = createCachedFunction(
  getTrackSegment,
  (stationCode) => stationCode, // cache key
  // cache validity condition
  (cachedValue, id, start, end) => {
    const cachedStart = JSON.stringify(cachedValue?.start)
    const cachedEnd = JSON.stringify(cachedValue?.end)
    return (
      cachedStart === JSON.stringify(start) && cachedEnd === JSON.stringify(end)
    )
  },
)

/**
 * Calculates the terminus point of a train on its track using its last station.
 * Used to position markers for trains that have completed their full route.
 *
 * @param trackLine - The GeoJSON LineString feature representing the track.
 * @param lastStop - The final stop object of the train's route.
 * @param stations - An array of all station objects, used to look up coordinates.
 * @returns An object with the snapped `point` on the track and an `undefined` bearing,
 * or `undefined` if the last station's coordinates cannot be found.
 */
const getTrackTerminus = (
  trackLine: Feature<LineString>,
  lastStop: Stop,
  stations: Station[],
) => {
  const stationCoords = getStationCoordinates(lastStop.code, stations)
  if (!stationCoords) {
    return
  }
  return {
    point: nearestPointOnLine(trackLine, point(stationCoords)),
    bearing: undefined,
  }
}

/**
 * Extrapolates a train's position on a track based on its last-reported GPS position and
 * timetable.
 *
 * @param trainPosition - The last-reported GPS coordinates of the train as [lon, lat].
 * @param trackId - The track on which the train is traveling, represented as an ID.
 * @param trainMeta - The status of the train, containing information about its timetable.
 * @param stations - An array of station objects containing station codes and coordinates.
 * @returns An object containing the extrapolated position of the train as a Feature<Point>,
 * and the bearing along the track as a number of degrees, if able to calculate.
 *
 * @example
 * const trainPosition = [-122.4194, 37.7749] // coordinates
 * const trackId = '4332'
 * const trainMeta = {
 *   nextStop: 'NYP',
 *   updated: new Date(),
 *   ...
 * }
 * const stations = [
 *   { code: 'NYP', lon: -74.0060, lat: 40.7128, ... },
 *   ...
 * ];
 * const result = getExtrapolatedTrainPoint(
 *   train,
 *   { id: 'track-id', index: 0 },
 *   trainMeta,
 *   stations,
 * );
 * console.log(result); // Extrapolated position + bearing of the train
 *
 * @description
 * This function gets the track segment between the train's last passed station and
 * its next scheduled station. If the train's last-reported GPS position is between
 * the previous and next-scheduled stations, the track segment is refined to start
 * from that last known point.
 *
 * It then calculates the time elapsed on this segment relative to the total planned
 * travel time. This progress percentage is applied to the segment's total distance
 * to estimate how far along the track the train should be, returning the extrapolated
 * point and its corresponding bearing on the track.
 */
export const getExtrapolatedTrainPoint = (
  trainPosition: Position,
  trackId: TrackId,
  trainMeta: TrainMeta,
  stations: Station[],
) => {
  console.time(`getExtrapolatedTrainPoint ${trainMeta.id}`)
  const trackLine = getTrackFromId(trackId, amtrakTrack)
  if (!trackLine) {
    return
  }

  // If train has arrived, snap it to the track nearest the last station's
  // coordinates
  if (trainMeta.code === TimeStatus.COMPLETE) {
    return getTrackTerminus(trackLine, trainMeta.lastStop, stations)
  }

  const prevStop = trainMeta.curStop ?? trainMeta.prevStop
  const { nextStop } = trainMeta
  if (!prevStop || !nextStop) {
    return
  }

  const prevStationCoords = getStationCoordinates(prevStop.code, stations)
  const nextStationCoords = getStationCoordinates(nextStop.code, stations)
  if (!prevStationCoords || !nextStationCoords) {
    return
  }

  // get the track segment between the train's previous/current and next
  // station
  let trackSegment = getTrackSegmentCached(
    `${prevStop.code}-${nextStop.code}`,
    prevStationCoords,
    nextStationCoords,
    trackLine,
  ).track
  let startTime: Date | null = prevStop.arrival.time

  if (!trackSegment?.geometry?.coordinates?.length) {
    return
  }

  // check if train's GPS coordinate is on the current track segment (according
  // to the timetable)
  // if the previous station (per timetable) is behind the train GPS position
  console.log('trainPosition:', trainPosition)
  console.log('trackSegment:', cleanCoords(trackSegment))
  let trainGPSOnTrackSegment
  try {
    trainGPSOnTrackSegment =
      pointToLineDistance(point(trainPosition), cleanCoords(trackSegment)) < 0.1
  } catch (e) {
    console.error(e)
    return
  }
  if (
    !trainGPSOnTrackSegment
    // isPointBehindTrain(
    //   point(prevStationCoords),
    //   point(trainPosition),
    //   stations,
    //   nextStop,
    // )
  ) {
    console.log('train ID:', trainMeta.id)
    console.log('trainPosition:', trainPosition)
    console.log('nextStationCoords:', nextStationCoords)
    console.log('trackSegment:', cleanCoords(trackSegment))
    // narrow the track segment from to only consider the portion between the
    // train GPS position and next station
    trackSegment = lineSlice(
      trainPosition,
      nextStationCoords,
      // https://github.com/Turfjs/turf/issues/2808#issuecomment-2586619743
      cleanCoords(trackSegment),
    )
    startTime = trainMeta.updated
  }

  if (!nextStop.arrival.time || !startTime) {
    return
  }

  const totalTime = nextStop.arrival.time.getTime() - startTime.getTime()
  const totalDistance = length(trackSegment)
  const timeElapsed = new Date().getTime() - startTime.getTime()
  const progress = timeElapsed / totalTime
  const distanceCovered = totalDistance * progress

  const extrapolatedPoint = along(trackSegment, distanceCovered)
  const bearing = getBearing(
    extrapolatedPoint,
    trackSegment.geometry,
    stations,
    nextStop,
  )
  console.timeEnd(`getExtrapolatedTrainPoint ${trainMeta.id}`)
  return {
    point: extrapolatedPoint,
    bearing,
  }
}

const getRouteTrack = (map: MapRef, train: Train) => {
  // lineSlice + along
}
