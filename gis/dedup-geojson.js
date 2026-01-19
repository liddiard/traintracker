#!/usr/bin/env node

import fs from 'fs'

/**
 * Entry point. Parses command-line arguments, reads input file,
 * processes the FeatureCollection, and writes the result.
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error('Usage: node dedup-geojson.js <input-file> <output-file>')
    process.exit(1)
  }

  const [inputFile, outputFile] = args

  let inputData
  try {
    const rawData = fs.readFileSync(inputFile, 'utf8')
    inputData = JSON.parse(rawData)
  } catch (err) {
    console.error(`Error reading input file: ${err.message}`)
    process.exit(1)
  }

  if (
    inputData.type !== 'FeatureCollection' ||
    !Array.isArray(inputData.features)
  ) {
    console.error('Input must be a GeoJSON FeatureCollection')
    process.exit(1)
  }

  const result = processFeatureCollection(inputData)

  try {
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2))
    console.log(`Output written to ${outputFile}`)
  } catch (err) {
    console.error(`Error writing output file: ${err.message}`)
    process.exit(1)
  }
}

/**
 * Processes a GeoJSON FeatureCollection by removing globally duplicate coordinates.
 *
 * Features are sorted by their "shape_id" property (parsed as Number, ascending)
 * before processing, ensuring coordinates are retained in lower shape_id features
 * and removed from higher ones when duplicates exist.
 *
 * @param {Object} featureCollection - A GeoJSON FeatureCollection with MultiLineString features
 * @returns {Object} A new FeatureCollection with duplicates removed and LineStrings split
 */
function processFeatureCollection(featureCollection) {
  // Sort features by shape_id to ensure deterministic duplicate resolution.
  // Lower shape_id features get to "claim" coordinates first.
  const sortedFeatures = [...featureCollection.features].sort((a, b) => {
    const shapeIdA = Number(a.properties?.shape_id)
    const shapeIdB = Number(b.properties?.shape_id)
    return shapeIdA - shapeIdB
  })

  // Global set to track all coordinates we've encountered across all features.
  const seenCoordinates = new Set()
  const outputFeatures = []

  for (const feature of sortedFeatures) {
    const processedFeature = processFeature(feature, seenCoordinates)
    // processFeature returns null if all geometry was removed
    if (processedFeature !== null) {
      outputFeatures.push(processedFeature)
    }
  }

  // Preserve any additional properties on the FeatureCollection.
  return {
    ...featureCollection,
    features: outputFeatures,
  }
}

/**
 * Converts a coordinate array to a string key for Set storage/lookup.
 * Uses exact floating-point string representation for comparison.
 *
 * @param {number[]} coord - A coordinate array [longitude, latitude]
 * @returns {string} A string key in the format "lng,lat"
 */
function coordToKey(coord) {
  return `${coord[0]},${coord[1]}`
}

/**
 * Processes a single Feature, removing duplicate coordinates from its geometry.
 *
 * @param {Object} feature - A GeoJSON Feature with MultiLineString geometry
 * @param {Set<string>} seenCoordinates - Global set of already-seen coordinate keys (mutated)
 * @returns {Object|null} A new Feature with deduplicated geometry, or null if no valid geometry remains
 */
function processFeature(feature, seenCoordinates) {
  if (feature.geometry?.type !== 'MultiLineString') {
    console.warn(
      `Skipping non-MultiLineString feature with shape_id: ${feature.properties?.shape_id}`,
    )
    return null
  }

  const inputLineStrings = feature.geometry.coordinates
  const outputLineStrings = []

  for (const lineString of inputLineStrings) {
    const resultLineStrings = processLineString(lineString, seenCoordinates)
    // A single input LineString may become multiple LineStrings after splitting,
    // so we spread them into the output array
    outputLineStrings.push(...resultLineStrings)
  }

  // If all LineStrings were removed (degenerate), exclude this feature entirely
  if (outputLineStrings.length === 0) {
    return null
  }

  // Preserve all feature properties while replacing the geometry coordinates
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: outputLineStrings,
    },
  }
}

/**
 * Processes a single LineString, removing duplicate coordinates and splitting
 * into multiple LineStrings where consecutive duplicates create gaps.
 *
 * When a duplicate coordinate is encountered, the current segment is "closed"
 * (if it has 2+ points) and a new segment begins after the duplicate(s).
 * This avoids creating degenerate geometries where removed points would have
 * connected two non-adjacent points.
 *
 * @param {number[][]} lineString - Array of coordinate arrays [[lng, lat], ...]
 * @param {Set<string>} seenCoordinates - Global set of already-seen coordinate keys (mutated)
 * @returns {number[][][]} Array of LineStrings (may be empty, one, or multiple)
 */
function processLineString(lineString, seenCoordinates) {
  const resultLineStrings = []
  let currentSegment = []

  for (const coord of lineString) {
    const key = coordToKey(coord)

    if (seenCoordinates.has(key)) {
      // Duplicate found: close out the current segment if it's valid (2+ points).
      // This creates the "split" - points before and after duplicates become
      // separate LineStrings rather than being incorrectly connected.
      if (currentSegment.length >= 2) {
        resultLineStrings.push(currentSegment)
      }
      // Start fresh - don't include the duplicate point in any segment
      currentSegment = []
    } else {
      // New coordinate: mark as seen and add to current segment
      seenCoordinates.add(key)
      currentSegment.push(coord)
    }
  }

  // Don't forget the final segment after the loop ends
  if (currentSegment.length >= 2) {
    resultLineStrings.push(currentSegment)
  }

  return resultLineStrings
}

main()
