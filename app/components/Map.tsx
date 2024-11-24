'use client'

import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import './MapLegend'

function Map() {
  useEffect(() => {
    const map = new maplibregl.Map({
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-98.5795, 39.8283], // geographic center of the US
      zoom: 3,
      container: 'map',
    }).on('load', () => {
      map.addSource('amtrak-track', {
        type: 'geojson',
        data: './amtrak-track.geojson',
      })
      map.addLayer({
        id: 'amtrak-track',
        type: 'line',
        source: 'amtrak-track',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#167fa6',
          'line-width': 2,
        },
      })
    })
  }, [])

  return (
    <>
      <div id="map" className="h-full" />
      {/* <MapLegend /> */}
    </>
  )
}

export default Map
