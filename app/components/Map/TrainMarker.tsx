import { Marker } from 'react-map-gl/maplibre'
import { Marker as MarkerType } from 'maplibre-gl'
import { useRef, useEffect } from 'react'
import Pointer from '@/app/img/pointer.svg'
import Circle from '@/app/img/train-circle.svg'
import { TrainFeatureProperties } from '@/app/types'
import { DETAIL_ZOOM_LEVEL, TRAIN_UPDATE_FREQ } from './constants'
import { useAnimatedPosition } from '../hooks'

interface TrainMarkerProps extends TrainFeatureProperties {
  coordinates: [number, number] | null
  heading: number
  zoom: number
  isSelected: boolean
  navigateToTrain: (trainID: string) => void
}

function TrainMarker({
  id,
  color,
  coordinates,
  heading,
  zoom,
  isSelected,
  navigateToTrain,
  skipAnimation,
}: TrainMarkerProps) {
  const markerRef = useRef<MarkerType>(null)
  const animPosition = useAnimatedPosition(
    coordinates,
    heading,
    TRAIN_UPDATE_FREQ,
    skipAnimation,
  )

  // Extract primitive values so they can be used as effect dependencies
  // (arrays are compared by reference, primitives by value)
  const lng = coordinates?.[0]
  const lat = coordinates?.[1]

  // Enable subpixel positioning for smoother animations
  // https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MarkerOptions/#subpixelpositioning
  useEffect(() => {
    if (!lng || !lat) {
      return
    }
    markerRef.current?.setSubpixelPositioning(true)
  }, [lng, lat, heading])

  const sharedStyles = {
    scale: `clamp(0.5, ${0.5 + zoom * 0.1}, 1.75)`,
    fill: color,
    stroke: 'white',
    strokeWidth: 5,
  }

  if (!animPosition?.coordinates) {
    return null
  }

  return (
    <Marker
      longitude={animPosition.coordinates[0]}
      latitude={animPosition.coordinates[1]}
      rotation={animPosition.heading ?? undefined}
      rotationAlignment="map"
      pitchAlignment="map"
      ref={markerRef}
      className="cursor-pointer p-2"
      style={{
        zIndex: isSelected ? 1 : 'unset',
      }}
      onClick={() => navigateToTrain(id)}
    >
      {heading === null || zoom < DETAIL_ZOOM_LEVEL ? (
        <Circle className="w-2" style={sharedStyles} />
      ) : (
        <Pointer className="w-4" style={sharedStyles} />
      )}
    </Marker>
  )
}

export default TrainMarker
