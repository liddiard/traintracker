'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import MapGL, { Source, Layer } from 'react-map-gl/maplibre'
import type {
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapRef,
  ViewStateChangeEvent,
} from 'react-map-gl/maplibre'
import { FeatureCollection, MultiLineString, Point, LineString } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useTrains } from '../../providers/train'
import {
  trainsToGeoJson,
  stationLabelLayer,
  stationLayer,
  stationsToGeoJson,
  trackLayer,
  trainLabelLayer,
} from './display'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'
import TrainMarker from './TrainMarker'
import { TrainFeatureProperties } from '@/app/types'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString
>

function Map() {
  const { trains, stations } = useTrains()
  const router = useRouter()
  const trainID = useParams().id
  const query = useSearchParams()

  const [loaded, setLoaded] = useState(false)

  const mapRef = useRef<MapRef>(null)

  const currentTrain = useMemo(
    () => trains.find((t) => t.objectID === trainID),
    [trains, trainID],
  )

  useEffect(() => {
    if (!currentTrain || !mapRef.current) {
      return
    }
    const { lat, lon } = currentTrain
    const zoom = mapRef.current.getZoom()
    const minFlyZoom = 8
    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: zoom < minFlyZoom ? minFlyZoom : undefined,
    })
  }, [currentTrain?.objectID])

  const cursorPointer = (ev: MapLayerMouseEvent) =>
    (ev.target.getCanvas().style.cursor = 'pointer')

  const cursorDefault = (ev: MapLayerMouseEvent) =>
    (ev.target.getCanvas().style.cursor = '')

  const navigateToTrain = (
    ev: MapLayerMouseEvent & {
      features?: MapGeoJSONFeature[]
    },
  ) => {
    const trainID = ev.features?.[0].properties.objectID
    if (trainID) {
      router.push(`/train/${trainID}`)
    }
  }

  const handleMoveEnd = (ev: ViewStateChangeEvent) => {
    const url = new URL(window.location.href)
    const map = ev.target
    const { lat, lng } = map.getCenter()
    url.searchParams.set('lat', lat.toFixed(5))
    url.searchParams.set('lng', lng.toFixed(5))
    url.searchParams.set('z', map.getZoom().toFixed(1))
    router.replace(url.toString())
  }

  const trainsGeoJson = useMemo(
    () =>
      mapRef.current
        ? trainsToGeoJson(mapRef.current, trains, stations)
        : ({
            type: 'FeatureCollection',
            features: [],
          } as FeatureCollection<Point, TrainFeatureProperties>),
    [mapRef, loaded, trains, stations],
  )
  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={{
          // default to geographic center of the US
          longitude: Number(query.get('lng')) || -98.5795,
          latitude: Number(query.get('lat')) || 39.8283,
          zoom: Number(query.get('z')) || 3,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        onLoad={() => setLoaded(true)}
        onMoveEnd={handleMoveEnd}
        onMouseEnter={cursorPointer}
        onMouseLeave={cursorDefault}
        onClick={navigateToTrain}
        interactiveLayerIds={['trains', 'train-labels']}
      >
        <Source id="amtrak-track" type="geojson" data={amtrakTrack}>
          <Layer {...trackLayer} />
        </Source>
        <Source
          id="amtrak-stations"
          type="geojson"
          data={stationsToGeoJson(stations)}
        >
          <Layer {...stationLayer} />
          <Layer {...stationLabelLayer} />
        </Source>
        {trainsGeoJson.features.map((f) => (
          <TrainMarker
            key={f.properties.objectID}
            coordinates={f.geometry.coordinates}
            bearing={f.properties.bearing}
          />
        ))}
        {loaded && mapRef.current ? (
          <Source id="trains" type="geojson" data={trainsGeoJson}>
            {/* <Layer {...trainLayer} /> */}
            <Layer {...trainLabelLayer} />
          </Source>
        ) : null}
      </MapGL>
    </>
  )
}

export default Map
