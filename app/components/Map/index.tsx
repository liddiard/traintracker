'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import MapGL, {
  Source,
  Layer,
  GeolocateControl,
  FullscreenControl,
  NavigationControl,
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
import { useSettings } from '../../providers/settings'
import { MapStyle } from '@/app/types'
import {
  trainsToGeoJson,
  stationLabelLayer,
  stationLayer,
  stationsToGeoJson,
  trackLayer,
  trainToGeoJSON,
  trainGPSLabelLayer,
} from './display'
import _amtrakTrack from '@/public/map_data/amtrak-track.geojson'
import TrainMarker from './TrainMarker'
import { TrainFeatureProperties } from '@/app/types'
import { getTrainShortcode, sleep } from '@/app/utils'
import { sourceId } from './constants'
import TrainGPS from './TrainGPS'
import TrainLabel from './TrainLabel'
import MapSettings from './Settings'

const amtrakTrack = _amtrakTrack as FeatureCollection<
  LineString | MultiLineString
>

const mapStyleUrls: Record<MapStyle, string> = {
  gray: 'https://tiles.openfreemap.org/styles/positron',
  simple: 'https://tiles.openfreemap.org/styles/bright',
  detailed: 'https://tiles.openfreemap.org/styles/liberty',
}

const emptyTrainData: FeatureCollection<Point, TrainFeatureProperties> = {
  type: 'FeatureCollection',
  features: [],
}

function Map() {
  const { trains, stations } = useTrains()
  const { settings } = useSettings()
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
  const [moving, setMoving] = useState(false)
  const [viewState, setViewState] = useState(initialViewState)
  const [trainData, setTrainData] = useState(emptyTrainData)

  const mapRef = useRef<MapRef>(null)

  const selectedTrain = useMemo(
    () => trains.find((t) => t.objectID === trainID),
    [trains, trainID],
  )

  const updateTrains = useCallback(() => {
    console.log('updateTrains', new Date())
    setTrainData(trainsToGeoJson(trainData, mapRef.current!, trains, stations))
  }, [trainData, trains, stations])

  useEffect(() => {
    if (!loaded) {
      return
    }
    setTrainData(
      trainsToGeoJson(emptyTrainData, mapRef.current!, trains, stations),
    )
  }, [loaded, trains, stations])

  useEffect(() => {
    ;(async () => {
      await sleep(5000)
      updateTrains()
    })()
  }, [updateTrains])

  const navigateToTrain = async (trainID: string) => {
    await router.push(`/train/${trainID}`)
    if (!mapRef.current) {
      return
    }
    // update current (selected) train
    setTrainData(trainsToGeoJson(trainData, mapRef.current!, trains, stations))
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
    setMoving(false)
    setViewState({ ...viewState, ...ev.viewState })
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
    </>
  )

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={mapStyleUrls[settings.mapStyle]}
        onLoad={() => {
          updateTrains()
          setLoaded(true)
        }}
        onMoveStart={() => setMoving(true)}
        onMoveEnd={handleMoveEnd}
        onClick={(
          ev: MapLayerMouseEvent & {
            features?: MapGeoJSONFeature[]
          },
        ) => {
          const trainID = ev.features?.[0]?.properties.objectID
          if (trainID) navigateToTrain(trainID)
        }}
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

        {selectedTrain && (
          <Source
            id={sourceId.trainGPS}
            type="geojson"
            data={trainToGeoJSON(selectedTrain)}
          >
            <Layer {...trainGPSLabelLayer} />
          </Source>
        )}

        {trainData.features.map((f) => (
          <Fragment key={f.properties.objectID}>
            <TrainMarker
              coordinates={f.geometry.coordinates}
              zoom={viewState.zoom}
              moving={moving}
              navigateToTrain={navigateToTrain}
              isSelected={selectedTrain?.objectID === f.properties.objectID}
              {...f.properties}
            />
            <TrainLabel
              coordinates={f.geometry.coordinates}
              zoom={viewState.zoom}
              moving={moving}
              navigateToTrain={navigateToTrain}
              isSelected={selectedTrain?.objectID === f.properties.objectID}
              {...f.properties}
            />
          </Fragment>
        ))}

        {selectedTrain && viewState.zoom > 6 && (
          <TrainGPS
            coordinates={[selectedTrain.lon, selectedTrain.lat]}
            zoom={viewState.zoom}
            shortcode={getTrainShortcode(selectedTrain)}
          />
        )}
      </MapGL>
      <MapSettings />
    </>
  )
}

export default Map
