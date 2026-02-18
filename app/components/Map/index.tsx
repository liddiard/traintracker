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
  AttributionControl,
} from 'react-map-gl/maplibre'
import type {
  LngLatBoundsLike,
  LngLatLike,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapRef,
  ViewState,
  ViewStateChangeEvent,
} from 'react-map-gl/maplibre'
import { FeatureCollection, MultiLineString, Point, LineString } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useTrains } from '../../providers/train'
import { useSettings } from '../../providers/settings'
import { BottomSheetPosition, MapStyle } from '@/app/types'
import {
  trainsToGeoJson,
  getStationLabelLayer,
  getStationLayer,
  stationsToGeoJson,
  getTrackLayer,
  getTrainGPSLabelLayer,
} from './display'
import _track from '@/public/map_data/track.json'
import TrainMarker from './TrainMarker'
import { TrainFeatureProperties } from '@/app/types'
import { sleep } from '@/app/utils'
import { sourceId, TRAIN_UPDATE_FREQ } from './constants'
import Crosshair from './Crosshair'
import TrainLabel from './TrainLabel'
import MapSettings from './Settings'
import Header from './Header'
import { useBottomSheet } from '@/app/providers/bottomSheet'
import { MOBILE_BREAKPOINT } from '@/app/constants'

const track = _track as FeatureCollection<LineString | MultiLineString>

// Compute expected bottom padding from sheet position without waiting for the sheet
// animation. This avoids race conditions where the map moves before the sheet reports
// its height.
function computePadding(
  position: BottomSheetPosition,
  isMobile: boolean,
): { bottom: number } {
  if (!isMobile || typeof window === 'undefined') return { bottom: 0 }
  const sheetHeight =
    position === 'bottom'
      ? 100
      : position === 'middle'
        ? window.innerHeight * 0.5
        : window.innerHeight
  return {
    bottom:
      Math.min(sheetHeight, (window.innerHeight - 35) / 2) +
      (window.outerHeight - window.innerHeight),
  }
}

const mapStyleUrls: Record<MapStyle, string> = {
  gray: 'https://tiles.openfreemap.org/styles/positron',
  simple: 'https://tiles.openfreemap.org/styles/bright',
  detailed: 'https://tiles.openfreemap.org/styles/liberty',
}

const emptyTrainData: FeatureCollection<Point, TrainFeatureProperties> = {
  type: 'FeatureCollection',
  features: [],
}

// maximum zoom level for sources and layers
const MAX_ZOOM = 12

function Map() {
  const { trains, stations } = useTrains()
  const { settings, updateSetting } = useSettings()
  const { position, setPosition } = useBottomSheet()
  const router = useRouter()
  const { agency, id, code } = useParams() // train agency, train ID, station code
  const query = useSearchParams()

  const initialViewState = useMemo(
    () => ({
      // default to bounding box of all tracks plus a 10-degree margin in each direction,
      // calculated statically for performance using Turf.js:
      // const turf = require('@turf/turf')
      // const track = require('./public/map_data/track.json')
      // const bbox = turf.bbox(track)
      bounds: [
        -130.35971 - 5,
        25.78015,
        -63.26974 + 5,
        58.76772,
      ] as LngLatBoundsLike,
      zoom: Number(query.get('z')) || 3,
      bearing: 0,
    }),
    [query],
  )

  const [loaded, setLoaded] = useState(false)
  const [viewState, setViewState] = useState(initialViewState)
  const [trainData, setTrainData] = useState(emptyTrainData)
  const [isMobile, setIsMobile] = useState(false)

  const mapRef = useRef<MapRef>(null)
  const flownToTrain = useRef<string>(null)
  const followSetting = useRef<boolean>(null)

  // Create layers after mount to ensure CSS color variables are available
  const trackLayer = useMemo(() => getTrackLayer(), [])
  const stationLayer = useMemo(() => getStationLayer(), [])
  const stationLabelLayer = useMemo(() => getStationLabelLayer(), [])
  const trainGPSLabelLayer = useMemo(() => getTrainGPSLabelLayer(), [])

  // use refs so the data update interval doesn't restart on API updates
  const trainsRef = useRef(trains)
  const stationsRef = useRef(stations)
  useEffect(() => {
    trainsRef.current = trains
    stationsRef.current = stations
  }, [trains, stations])

  // set mounted flag to avoid hydration errors when checking window dimensions
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)

    // update isMobile on window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedTrain = useMemo(
    () => trainData.features.find((t) => t.id === `${agency}/${id}`),
    [trainData, agency, id],
  )

  const selectedStation = useMemo(
    () => stations.find((s) => s.agency === agency && s.code === code),
    [stations, code, agency],
  )

  // padding to keep map centered and controls above bottom sheet when the sheet is at
  // its bottom or middle snap points
  const padding = useMemo(
    () => ({
      bottom:
        !loaded || !isMobile ? 0 : computePadding(position, isMobile).bottom,
    }),
    [position, loaded, isMobile],
  )

  const updateTrains = useCallback(() => {
    setTrainData((prevData) =>
      trainsToGeoJson(
        prevData,
        mapRef.current!,
        trainsRef.current,
        stationsRef.current,
      ),
    )
  }, [])

  // update train positions at a fixed interval for consistent animation timing
  useEffect(() => {
    const intervalId = setInterval(updateTrains, TRAIN_UPDATE_FREQ)
    return () => clearInterval(intervalId)
  }, [updateTrains])

  // move the map to keep centered a train we're following, or to fly to a new train
  // the user just selected
  useEffect(() => {
    if (!selectedTrain || !mapRef.current) {
      flownToTrain.current = null
      return
    }
    // if the selected train hasn't changed (its coordinates just updated), and we're
    // following that train on the map…
    if (flownToTrain.current === selectedTrain.id && settings.follow) {
      // …and if the follow setting was just turned on
      if (followSetting.current !== settings.follow) {
        // move map to the updated train coordinates with default easing
        mapRef.current.panTo(selectedTrain.geometry.coordinates as LngLatLike, {
          duration: 500,
          padding,
        })
      } else {
        // if we were already following the train, move map linearly to the updated
        // train coordinates in sync with the time until the next position update
        mapRef.current.panTo(selectedTrain.geometry.coordinates as LngLatLike, {
          duration: TRAIN_UPDATE_FREQ,
          easing: (x) => x,
          padding,
        })
      }
    }
    // if the selected train changed…
    else if (flownToTrain.current !== selectedTrain.id) {
      // stop following any current train
      updateSetting('follow', false)
      // partially close bottom sheet to reveal map
      setPosition('middle')
      // …fly to train on map, zooming in if the map is far zoomed out
      const zoom = mapRef.current.getZoom()
      const minFlyZoom = 9
      mapRef.current.flyTo({
        center: selectedTrain.geometry.coordinates as LngLatLike,
        zoom: zoom < minFlyZoom ? minFlyZoom : undefined,
        padding: computePadding('middle', isMobile),
      })
      flownToTrain.current = selectedTrain.id as string
      setTimeout(() => {
        updateTrains()
        updateSetting('follow', true)
        followSetting.current = true
      }, 5000)
    }
    followSetting.current = settings.follow
  }, [
    selectedTrain,
    settings.follow,
    updateSetting,
    padding,
    setPosition,
    isMobile,
    updateTrains,
  ])

  // fly to a new station that the user selected
  useEffect(() => {
    if (!mapRef.current || !selectedStation) {
      return
    }
    const zoom = mapRef.current.getZoom()
    const minFlyZoom = 12
    mapRef.current.flyTo({
      center: selectedStation.coordinates as LngLatLike,
      zoom: zoom < minFlyZoom ? minFlyZoom : undefined,
      padding,
    })
  }, [loaded, selectedStation, padding])

  const syncMapState = async (ev: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = ev.viewState
    setViewState({ ...viewState, ...ev.viewState })
    if (ev.originalEvent) {
      updateTrains()
    }
    // arbitrary sleep to prevent a race condition between updating the URL here and
    // `navigateToTrain`, which also updates the URL and causes the map to move
    await sleep(100)
    const url = new URL(window.location.href)
    url.searchParams.set('lat', latitude.toFixed(5))
    url.searchParams.set('lng', longitude.toFixed(5))
    url.searchParams.set('z', zoom.toFixed(1))
    await router.replace(url.toString(), { scroll: false })
  }

  // redirect to a train by id, where `id` is in the format: <agency>/<operator_id>
  const navigateToTrain = useCallback(
    (id: string) => {
      router.push(`/train/${id}`)
    },
    [router],
  )

  const handleMapLoad = useCallback(() => {
    setLoaded(true)
    // Immediately load train data (before the setInterval first runs)
    updateTrains()
    // Re-fit bounds with padding to center tracks above bottom sheet
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      mapRef.current?.fitBounds(initialViewState.bounds as LngLatBoundsLike, {
        padding: computePadding('middle', true),
        duration: 0,
      })
    }
  }, [updateTrains, initialViewState.bounds])

  const handleMapClick = useCallback(
    (ev: MapLayerMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const station = ev.features?.[0]?.properties
      if (station?.code && station?.agency) {
        router.push(`/station/${station.agency}/${station.code}`)
      }
    },
    [router],
  )

  const controlStyle = useMemo<React.CSSProperties>(
    () => ({
      transform: `translateY(-${padding.bottom}px)`,
      transition: 'transform 500ms',
    }),
    [padding.bottom],
  )

  const renderControls = () => (
    <>
      <AttributionControl
        position="bottom-right"
        style={controlStyle}
        compact={isMobile}
      />
      <FullscreenControl position="bottom-right" style={controlStyle} />
      {viewState.bearing || !isMobile ? (
        <NavigationControl
          position="bottom-right"
          showZoom={!isMobile}
          showCompass={!!viewState.bearing}
          // show pitch on the compass control, plus (undocumented): reset not just
          // heading but also pitch on click
          visualizePitch={true}
          // `showCompass` only takes effect on component mount, so change the
          // key to force a remount when the bearing changes from due north
          // https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/navigation-control#other-properties
          key={viewState.bearing ? 'nav-control-compass' : 'nav-control'}
          style={controlStyle}
        />
      ) : null}
      <GeolocateControl
        position="bottom-right"
        trackUserLocation={true}
        style={controlStyle}
      />
    </>
  )

  const { shortcode, gpsCoordinates } = selectedTrain?.properties ?? {}

  return (
    <div className="h-full w-full">
      <Header />
      {/* https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/map */}
      <MapGL
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={mapStyleUrls[settings.mapStyle]}
        attributionControl={false}
        renderWorldCopies={false}
        minZoom={1.5}
        onLoad={handleMapLoad}
        onMove={(ev: ViewStateChangeEvent) => {
          // if it's a user-initiated map move, and we're currently following a train
          if (ev.originalEvent && settings.follow) {
            updateSetting('follow', false)
          }
        }}
        onMoveEnd={syncMapState}
        interactiveLayerIds={[sourceId.stations, sourceId.stationLabels]}
        onMouseEnter={() =>
          (mapRef.current!.getCanvas().style.cursor = 'pointer')
        }
        onMouseLeave={() =>
          (mapRef.current!.getCanvas().style.cursor = 'default')
        }
        onClick={handleMapClick}
      >
        {renderControls()}

        <Source
          id={sourceId.track}
          type="geojson"
          data={track}
          maxzoom={MAX_ZOOM}
        >
          <Layer {...trackLayer} />
        </Source>

        <Source
          id={sourceId.stations}
          type="geojson"
          data={stationsToGeoJson(stations)}
          maxzoom={MAX_ZOOM}
        >
          <Layer {...stationLayer} />
          <Layer {...stationLabelLayer} />
        </Source>

        {selectedTrain?.properties.gpsCoordinates && (
          <Source
            id={sourceId.trainGPS}
            type="geojson"
            data={{
              ...selectedTrain,
              geometry: {
                type: 'Point',
                coordinates: selectedTrain.properties.gpsCoordinates,
              },
            }}
            maxzoom={MAX_ZOOM}
          >
            <Layer {...trainGPSLabelLayer} />
          </Source>
        )}

        {trainData.features.map((f) => (
          <Fragment key={f.properties.id}>
            <TrainMarker
              coordinates={f.geometry.coordinates}
              zoom={viewState.zoom}
              navigateToTrain={navigateToTrain}
              isSelected={selectedTrain?.id === f.properties.id}
              {...f.properties}
            />
            <TrainLabel
              coordinates={f.geometry.coordinates}
              zoom={viewState.zoom}
              navigateToTrain={navigateToTrain}
              isSelected={selectedTrain?.id === f.properties.id}
              {...f.properties}
            />
          </Fragment>
        ))}

        {selectedTrain && gpsCoordinates && (
          <Crosshair
            gpsCoordinates={gpsCoordinates}
            shortcode={shortcode}
            zoom={viewState.zoom}
          />
        )}

        {selectedStation && (
          <Crosshair
            gpsCoordinates={selectedStation.coordinates}
            zoom={viewState.zoom}
          />
        )}
      </MapGL>
      <MapSettings style={controlStyle} />
    </div>
  )
}

export default Map
