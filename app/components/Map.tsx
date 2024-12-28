'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import maplibregl, { MapLayerEventType, Map as MapType } from 'maplibre-gl'
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
  const trainID = useParams().id
  const query = useSearchParams()

  const currentTrain = useMemo(
    () => trains.find((t) => t.objectID === trainID),
    [trains, trainID],
  )

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

    const navigateToTrain = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[]
      },
    ) => {
      const trainID = e.features?.[0].properties.objectID
      if (trainID) {
        router.push(`/train/${trainID}`)
      }
    }

    const cursorPointer = () =>
      (map.current!.getCanvas().style.cursor = 'pointer')

    const cursorDefault = () => (map.current!.getCanvas().style.cursor = '')

    map.current!.on('moveend', (e) => {
      const url = new URL(window.location.href)
      const map = e.target
      const { lat, lng } = map.getCenter()
      url.searchParams.set('lat', lat.toFixed(5))
      url.searchParams.set('lng', lng.toFixed(5))
      url.searchParams.set('z', map.getZoom().toFixed(1))
      router.replace(url.toString())
    })

    // Center the map on the coordinates of any clicked symbol from the 'symbols' layer.
    map.current!.on('click', 'train-locations', navigateToTrain)
    map.current!.on('click', 'train-labels', navigateToTrain)

    // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
    map.current!.on('mouseenter', 'train-locations', cursorPointer)
    map.current!.on('mouseenter', 'train-labels', cursorPointer)

    // Change it back to a pointer when it leaves.
    map.current!.on('mouseleave', 'train-locations', cursorDefault)
    map.current!.on('mouseleave', 'train-labels', cursorDefault)
  }, [])

  useEffect(() => {
    if (!trains || !mapLoaded) {
      return
    }
    updateTrains(map.current!, trains)
  }, [trains, mapLoaded])

  useEffect(() => {
    if (!currentTrain) {
      return
    }
    const { lat, lon } = currentTrain
    map.current!.flyTo({
      center: [lon, lat],
    })
  }, [currentTrain])

  return (
    <>
      <div id="map" className="h-full" />
      {/* <MapLegend /> */}
    </>
  )
}

export default Map
