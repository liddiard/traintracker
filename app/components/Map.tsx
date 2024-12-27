'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import maplibregl, { Map as MapType } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import './MapLegend'
import { useTrains } from '../providers/train'
import {
  renderStations,
  renderTracks,
  renderTrains,
  updateTrains,
} from './mapUtils'

function Map() {
  const { trains } = useTrains()
  const [mapLoaded, setMapLoaded] = useState(false)
  const map = useRef<MapType | null>(null)
  const router = useRouter()
  const query = useSearchParams()

  // default to geographic center of the US
  const lng = Number(query.get('lng')) || -98.5795
  const lat = Number(query.get('lat')) || 39.8283

  useEffect(() => {
    map.current = new maplibregl.Map({
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [lng, lat],
      zoom: Number(query.get('z')) || 3,
      container: 'map',
    }).on('load', () => {
      setMapLoaded(true)
      renderTracks(map.current!)
      renderStations(map.current!)
      renderTrains(map.current!)
    })

    map.current!.on('moveend', (e) => {
      const url = new URL(window.location.href)
      const map = e.target
      const { lat, lng } = map.getCenter()
      url.searchParams.set('lat', lat.toFixed(5))
      url.searchParams.set('lng', lng.toFixed(5))
      url.searchParams.set('z', map.getZoom().toFixed(1))
      router.replace(url.toString())
    })
  }, [])

  useEffect(() => {
    if (!trains || !mapLoaded) {
      return
    }
    updateTrains(map.current!, trains)
  }, [trains, mapLoaded])

  return (
    <>
      <div id="map" className="h-full" />
      {/* <MapLegend /> */}
    </>
  )
}

export default Map
