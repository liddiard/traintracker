#!/usr/bin/env node

import process from 'process'

// List of layer IDs to remove
const layerIdsToRemove = new Set([
  'waterway_line_label',
  'water_name_point_label',
  'water_name_line_label',
  'highway-name-path',
  'highway-name-minor',
  'highway-name-major',
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
  'airport',
  'label_other',
  'label_village',
  'label_town',
  'label_state',
  'label_city',
  'label_city_capital',
  'label_country_3',
  'label_country_2',
  'label_country_1',
  'poi_r1',
  'poi_r7',
  'poi_r20',
  'poi_transit',
])

// Read from stdin
let inputData = ''

process.stdin.setEncoding('utf8')

process.stdin.on('readable', () => {
  let chunk
  while ((chunk = process.stdin.read()) !== null) {
    inputData += chunk
  }
})

process.stdin.on('end', () => {
  try {
    // Parse the JSON
    const styleSpec = JSON.parse(inputData)

    // Check if layers array exists
    if (!styleSpec.layers || !Array.isArray(styleSpec.layers)) {
      console.error(
        'Error: Invalid MapLibre Style Spec - missing or invalid layers array',
      )
      process.exit(1)
    }

    // Filter out layers with IDs in the removal list
    const originalLayerCount = styleSpec.layers.length
    styleSpec.layers = styleSpec.layers.filter((layer) => {
      return !layerIdsToRemove.has(layer.id)
    })

    const removedCount = originalLayerCount - styleSpec.layers.length

    // Output the modified JSON
    console.log(JSON.stringify(styleSpec, null, 2))

    // Log removal info to stderr so it doesn't interfere with the JSON output
    console.error(`Removed ${removedCount} layers from the style spec.`)
  } catch (error) {
    console.error('Error parsing JSON:', error.message)
    process.exit(1)
  }
})

// Handle errors
process.stdin.on('error', (error) => {
  console.error('Error reading from stdin:', error.message)
  process.exit(1)
})
