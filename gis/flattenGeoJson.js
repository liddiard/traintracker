// Pretty arbitrary script that requires explanation – see README.md for context

import fs from 'fs'

function main() {
  const args = process.argv.slice(4)

  if (args.length !== 4) {
    console.error(
      'Usage: node flattenGeoJson.js <input-file> <output-file> <agency> <shape-id>',
    )
    process.exit(1)
  }

  const [inputFile, outputFile, agency, shapeId] = args

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

  const result = processFeatureCollection(inputData, agency, shapeId)

  try {
    fs.writeFileSync(outputFile, JSON.stringify(result), 'utf-8')
    console.log(`Output written to ${outputFile}`)
  } catch (err) {
    console.error(`Error writing output file: ${err.message}`)
    process.exit(1)
  }
}

// Arrange line segments from a single-element MultiLineString in order to turn into a LineString
// Mutates the input collection
function processFeatureCollection(collection, agency, id) {
  // for the purposes of this script, we're really only expecting a single MutliLineString feature
  for (const feature of collection.features) {
    feature.geometry.type = 'LineString'
    feature.properties = {
      agency,
      id,
    }
    // sort line segments from west to east using longitude (first element of coordinate pair)
    feature.geometry.coordinates.sort((a, b) => a[0][0] - b[0][0])
    // southernmost segment starting from Bakersfield needs to be reversed to make
    // all coordinates in order on the LineString
    feature.geometry.coordinates[
      feature.geometry.coordinates.length - 1
    ].reverse()
    // convert from MultiLineString (array of arrays) to LineString
    feature.geometry.coordinates = feature.geometry.coordinates.flat()
  }
  return collection
}

main()
