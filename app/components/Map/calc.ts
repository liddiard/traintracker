import {
  point,
  nearestPointOnLine,
  bearing,
  explode,
  nearestPoint,
  distance,
  lineSlice,
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
  Point,
  Position,
} from 'geojson'
import {
  TrainMeta,
  Station,
  TrackFeatureProperties,
  TimeStatus,
  Stop,
} from '../../types'
import _track from '@/public/map_data/track.json'
import { createCachedFunction, getStopCoordinates } from '@/app/utils'

const tracks = _track as FeatureCollection<LineString, TrackFeatureProperties>

/**
 * Determines if a given point is behind a train relative to the next station.
 *
 * @param pt - The point to check, represented as a GeoJSON Feature of type Point.
 * @param trainPosition - The current position of the train, represented as a GeoJSON Feature of type Point.
 * @param stations - An array of all station objects, used to look up coordinates.
 * @param nextStop - The next station the train will arrive at, containing station information.
 * @param agency - The agency code of the last stop (e.g., 'amtrak', 'via', etc.).
 * @returns A boolean indicating whether the point is behind the train relative to the next station, or undefined if unknown.
 */
const isPointBehindTrain = (
  pt: Feature<Point>,
  trainPosition: Feature<Point>,
  stations: Station[],
  nextStop?: Stop,
  agency?: string,
) => {
  const station = stations.find(
    (s) => s.agency === agency && s.code === nextStop?.code,
  )
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
 * Calculates the heading of a train relative to its nearest point on the track.
 * For heading to be accurate, this function should only be used with
 * `trainPoints` that have been snapped to the track – i.e. precisely overlay
 * with a track LineString.
 *
 * @param trainPoint - The current position of the train as a GeoJSON Feature<Point>.
 * @param track - The track geometry as a GeoJSON LineString.
 * @param nextStop - The next station the train is heading towards (optional).
 * @param agency - The agency code of the last stop (optional).
 * @returns The heading in degrees, or undefined if the next station is not provided or if the nearest point is behind the train and cannot be determined.
 */
export const getHeading = (
  trainPoint: Feature<Point>,
  track: LineString,
  stations: Station[],
  nextStop?: Stop,
  agency?: string,
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
    agency,
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
 * Retrieves a track feature by its agency and ID.
 *
 * @param track - An object containing the track shape ID and agency name (e.g., 'amtrak', 'via', etc.).
 * @param tracks - The FeatureCollection containing the track feature to retrieve.
 * @returns The track feature as a LineString, or undefined if no track is found.
 */
const getTrackFromId = (
  track: TrackFeatureProperties,
  tracks: FeatureCollection<LineString, TrackFeatureProperties>,
) => {
  const trackFeature = tracks.features.find(
    (f) => f.properties.agency === track.agency && f.properties.id === track.id,
  )
  if (!trackFeature) {
    console.warn(`Unable to find track: ${track}`)
  }
  return trackFeature
}

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
  stationCode: string, // used for function cache key
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
    // https://github.com/Turfjs/turf/issues/2808#issuecomment-2586619743
    track: cleanCoords(trackSegment),
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
 * @param agency - The agency code of the train.
 * @param lastStop - The final stop object of the train's route.
 * @param stations - An array of all station objects, used to look up coordinates.
 * @returns An object with the snapped `point` on the track and an `undefined` heading,
 * or `undefined` if the last station's coordinates cannot be found.
 */
const getTrackTerminus = (
  trackLine: Feature<LineString>,
  agency: string,
  lastStop: Stop,
  stations: Station[],
) => {
  const stationCoords = getStopCoordinates(agency, lastStop.code, stations)
  if (!stationCoords) {
    return
  }
  return {
    point: nearestPointOnLine(trackLine, point(stationCoords)),
    heading: undefined,
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
 * and the heading along the track as a number of degrees, if able to calculate.
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
  track: TrackFeatureProperties,
  trainMeta: TrainMeta,
  stations: Station[],
) => {
  const trackLine = getTrackFromId(track, tracks)
  const agency = trainMeta.id.split('/')[0]

  if (!trackLine) {
    return
  }

  // If train has arrived, snap it to the track nearest the last station's
  // coordinates
  if (trainMeta.code === TimeStatus.COMPLETE) {
    return getTrackTerminus(trackLine, agency, trainMeta.lastStop, stations)
  }

  const prevStop = trainMeta.curStop ?? trainMeta.prevStop
  const { nextStop } = trainMeta
  if (!prevStop || !nextStop) {
    return
  }

  const prevStopCoords = getStopCoordinates(agency, prevStop.code, stations)
  const nextStopCoords = getStopCoordinates(agency, nextStop.code, stations)
  if (!prevStopCoords || !nextStopCoords) {
    return
  }

  // get the track segment between the train's previous/current and next
  // stop (per timetable)
  let timetableTrackSegment = getTrackSegmentCached(
    `${prevStop.code}-${nextStop.code}`,
    prevStopCoords,
    nextStopCoords,
    trackLine,
  ).track

  if (!timetableTrackSegment?.geometry?.coordinates?.length) {
    return
  }

  // check if train's GPS coordinate is on the current track segment (per timetable)
  let trainGPSOnTimetableTrackSegment
  try {
    // TODO: figure out if/why this would throw and if there's more appropriate error handling
    trainGPSOnTimetableTrackSegment =
      pointToLineDistance(point(trainPosition), timetableTrackSegment) < 0.1 // 100 meters
  } catch (e) {
    console.error(e)
    return
  }
  let trackSegment: Feature<LineString>
  let startTime: Date | null
  if (trainGPSOnTimetableTrackSegment) {
    // Narrow the track segment from to only consider the portion between the
    // train GPS position and next station.
    // This will calculate progress based on GPS location + its reported time
    // (`train.updated`) -> next stop location + its estimated time.
    trackSegment = lineSlice(
      trainPosition,
      nextStopCoords,
      timetableTrackSegment,
    )
    startTime = trainMeta.updated
  } else {
    // Calculate progress based on previous stop location + time -> the next stop
    // location + estimated time.
    trackSegment = timetableTrackSegment
    startTime = prevStop.departure.time
  }

  if (!nextStop.arrival.time || !startTime) {
    return
  }

  const totalTime = nextStop.arrival.time.getTime() - startTime.getTime()
  const totalDistance = length(trackSegment)
  const timeElapsed = new Date().getTime() - startTime.getTime()
  // If the train has a current stop, it is currently at a station which means it has
  // made zero progress on its upcoming segment.
  const progress = trainMeta.curStop ? 0 : timeElapsed / totalTime
  const distanceCovered = totalDistance * progress

  const extrapolatedPoint = along(trackSegment, distanceCovered)
  const heading = getHeading(
    extrapolatedPoint,
    trackSegment.geometry,
    stations,
    nextStop,
    agency,
  )
  return {
    point: extrapolatedPoint,
    heading,
  }
}
