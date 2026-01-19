import fs from 'fs/promises'

const file = process.argv[2]
const data = await fs.readFile(file, 'utf-8')
const geojson = JSON.parse(data)
const coordMap = {}

let removed = 0

// passed geojson features expected to be of type MultiLineString
const validFeatures = geojson.features.every(
  (feature) => feature.geometry.type === 'MultiLineString',
)

if (!validFeatures) {
  throw new Error('Features are not all of type MultiLineString')
}

geojson.features = geojson.features.map((feature) => ({
  ...feature,
  properties: {
    ...feature.properties,
    id: Number(feature.properties.shape_id),
  },
}))

geojson.features = geojson.features
  .toSorted((a, b) => a.properties.id - b.properties.id)
  .map((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((lineString) =>
        lineString.map((coord) => {
          const key = coord.join(',')
          if (coordMap[key]) {
            removed++
            return null
          }
          coordMap[key] = true
          return coord
        }),
      ),
    },
  }))

/*
// loop through MultiLineStrings
for (const multiLineString of geojson.features) {
  const orphanedSegments = []
  // loop through LineStrings
  for (const lineString of multiLineString.geometry.coordinates) {
    // loop through coordinates
    let isRemoving = false // track whether or not we're currently removing a duplicate line segment
    for (let i = 0; i < lineString.length; i++) {
      const coord = lineString[i]
      const key = coord.join(',')
      if (coordMap[key]) { // duplicate coordinate found
        if (removeIndexStart === -1) {
          removeIndexStart = i
        } else { // end of duplicate segment
          lineString.splice(removeIndexStart, i - removeIndexStart)
          removed++
          break
        }
      } else {
        coordMap[key] = true
      }
    }
  }
}
*/

console.log(`Removed ${removed} coordinates`)

await fs.writeFile(file, JSON.stringify(geojson))
console.log(`Wrote ${file}`)
