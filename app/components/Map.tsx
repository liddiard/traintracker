'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl, { GeoJSONSource, Map as MapType } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import './MapLegend'
import { Train } from '../types'
import { useTrains } from '../providers/train'

function Map() {
  const { trains } = useTrains()
  const [mapLoaded, setMapLoaded] = useState(false)
  const map = useRef<MapType | null>(null)

  useEffect(() => {
    map.current = new maplibregl.Map({
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-98.5795, 39.8283], // geographic center of the US
      zoom: 3,
      container: 'map',
    }).on('load', () => {
      setMapLoaded(true)
      map.current!.addSource('amtrak-track', {
        type: 'geojson',
        data: '/amtrak-track.geojson',
      })
      map.current!.addLayer({
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
      map.current!.addSource('amtrak-stations', {
        type: 'geojson',
        data: '/amtrak-stations.geojson',
      })
      map.current!.addLayer({
        id: 'amtrak-stations',
        type: 'circle',
        source: 'amtrak-stations',
        paint: {
          'circle-color': 'white',
          'circle-radius': 2,
          'circle-stroke-color': '#167fa6',
          'circle-stroke-width': 2,
        },
      })
      map.current!.addSource('train-locations', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
      map.current!.addLayer({
        id: 'train-locations',
        type: 'circle',
        source: 'train-locations',
        paint: {
          'circle-color': '#FF4018',
          'circle-radius': 3,
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
        },
      })
    })
  }, [])

  useEffect(() => {
    if (!trains || !mapLoaded) {
      return
    }
    updateTrainLocations(trains)
  }, [trains, mapLoaded])

  const updateTrainLocations = (trains: Train[]) => {
    const trainSource = map.current?.getSource(
      'train-locations',
    ) as GeoJSONSource
    if (!trainSource) {
      return
    }
    trainSource.setData({
      type: 'FeatureCollection',
      features: trains?.map((train) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [train.lon, train.lat],
        },
      })),
    })
  }

  return (
    <>
      <div id="map" className="h-full" />
      {/* <MapLegend /> */}
    </>
  )
}

export default Map
