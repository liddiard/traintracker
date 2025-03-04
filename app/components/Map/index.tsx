'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import MapGL, {
  Source,
  Layer,
  GeolocateControl,
  FullscreenControl,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre'
import type {
  LngLatLike,
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
  trainToGeoJSON,
  trainGPSLabelLayer,
} from './display'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'
import TrainMarker from './TrainMarker'
import { TrainFeatureProperties } from '@/app/types'
import { getTrainShortcode, sleep } from '@/app/utils'
import { sourceId } from './constants'
import TrainGPS from './TrainGPS'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString
>

function Map() {
  const { trains, stations } = useTrains()
  const router = useRouter()
  const trainID = useParams().id
  const query = useSearchParams()

  const initialViewState = {
    // default to geographic center of the US
    longitude: Number(query.get('lng')) || -98.5795,
    latitude: Number(query.get('lat')) || 39.8283,
    zoom: Number(query.get('z')) || 3,
    bearing: 0,
  }

  const [loaded, setLoaded] = useState(false)
  const [viewState, setViewState] = useState(initialViewState)
  const [trainData, setTrainData] = useState({
    type: 'FeatureCollection',
    features: [],
  } as FeatureCollection<Point, TrainFeatureProperties>)

  const mapRef = useRef<MapRef>(null)

  const selectedTrain = useMemo(
    () => trains.find((t) => t.objectID === trainID),
    [trains, trainID],
  )

  useEffect(() => {
    if (!mapRef.current) {
      return
    }
    const intervalId = setTimeout(
      () =>
        setTrainData(
          trainsToGeoJson(
            trainData,
            mapRef.current!,
            trains,
            stations,
            selectedTrain,
          ),
        ),
      1000,
    )
    return () => clearTimeout(intervalId)
  }, [trains, stations, selectedTrain, trainData, loaded])

  console.log('render', new Date())

  const cursorPointer = (ev: MapLayerMouseEvent) =>
    (ev.target.getCanvas().style.cursor = 'pointer')

  const cursorDefault = (ev: MapLayerMouseEvent) =>
    (ev.target.getCanvas().style.cursor = '')

  const navigateToTrain = async (trainID: string) => {
    await router.push(`/train/${trainID}`)
    if (!mapRef.current) {
      return
    }
    // update current (selected) train
    setTrainData(
      trainsToGeoJson(
        trainData,
        mapRef.current!,
        trains,
        stations,
        trains.find((t) => t.objectID === trainID),
      ),
    )
    const zoom = mapRef.current.getZoom()
    const trainPosition = trainData.features.find(
      (f) => f.properties.objectID === trainID,
    )?.geometry.coordinates
    const minFlyZoom = 8
    mapRef.current.flyTo({
      center: trainPosition as LngLatLike,
      zoom: zoom < minFlyZoom ? minFlyZoom : undefined,
    })
  }

  const handleMoveEnd = async (ev: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = ev.viewState
    setViewState(ev.viewState)
    // arbitrary sleep to prevent race condition between updating the URL here
    // and `navigateToTrain`, which also updates the URL and causes the map to
    // move
    await sleep(500)
    const url = new URL(window.location.href)
    url.searchParams.set('lat', latitude.toFixed(5))
    url.searchParams.set('lng', longitude.toFixed(5))
    url.searchParams.set('z', zoom.toFixed(1))
    await router.replace(url.toString(), { scroll: false })
  }

  const renderControls = () => (
    <>
      <FullscreenControl position="bottom-right" />
      <NavigationControl
        position="bottom-right"
        showCompass={!!viewState.bearing}
        // `showCompass` only takes effect on component mount, so change the
        // key to force a remount
        // https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/navigation-control#other-properties
        key={viewState.bearing ? 'nav-control-compass' : 'nav-control'}
      />
      <GeolocateControl position="bottom-right" />
      <ScaleControl />
    </>
  )

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        onLoad={() => setLoaded(true)}
        onMoveEnd={handleMoveEnd}
        onMouseEnter={cursorPointer}
        onMouseLeave={cursorDefault}
        onClick={(
          ev: MapLayerMouseEvent & {
            features?: MapGeoJSONFeature[]
          },
        ) => {
          const trainID = ev.features?.[0]?.properties.objectID
          if (trainID) navigateToTrain(trainID)
        }}
        interactiveLayerIds={['trains', 'train-labels']}
      >
        {renderControls()}
        <Source id={sourceId.amtrakTrack} type="geojson" data={amtrakTrack}>
          <Layer {...trackLayer} />
        </Source>
        <Source
          id={sourceId.amtrakStations}
          type="geojson"
          data={stationsToGeoJson(stations)}
        >
          <Layer {...stationLayer} />
          <Layer {...stationLabelLayer} />
        </Source>
        {loaded && mapRef.current ? (
          <Source id={sourceId.trains} type="geojson" data={trainData}>
            <Layer {...trainLabelLayer} />
          </Source>
        ) : null}
        {selectedTrain && (
          <Source
            id={sourceId.trainGPS}
            type="geojson"
            data={trainToGeoJSON(selectedTrain)}
          >
            <Layer {...trainGPSLabelLayer} />
          </Source>
        )}
        {selectedTrain && viewState.zoom > 6 && (
          <TrainGPS
            coordinates={[selectedTrain.lon, selectedTrain.lat]}
            zoom={viewState.zoom}
            shortcode={getTrainShortcode(selectedTrain)}
          />
        )}
        {trainData.features.map((f) => (
          <TrainMarker
            key={f.properties.objectID}
            coordinates={f.geometry.coordinates}
            zoom={viewState.zoom}
            navigateToTrain={navigateToTrain}
            {...f.properties}
          />
        ))}
      </MapGL>
    </>
  )
}

export default Map
