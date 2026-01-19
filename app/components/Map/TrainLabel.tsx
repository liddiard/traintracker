import { Marker } from 'react-map-gl/maplibre'
import { Marker as MarkerType } from 'maplibre-gl'
import { useRef, useEffect } from 'react'
import cn from 'classnames'
import { TrainFeatureProperties } from '@/app/types'
import { DETAIL_ZOOM_LEVEL, TRAIN_UPDATE_FREQ } from './constants'
import { useAnimatedPosition } from '../hooks'

interface TrainLabelProps extends TrainFeatureProperties {
  coordinates: number[] | null
  zoom: number
  navigateToTrain: (_trainID: string) => void
  name: string
  number: string
  isSelected: boolean
}

function TrainLabel({
  id,
  coordinates,
  zoom,
  name,
  number,
  isSelected,
  navigateToTrain,
  skipAnimation,
}: TrainLabelProps) {
  const markerRef = useRef<MarkerType>(null)
  // Pass heading=0 since label shouldn't rotate
  const animPosition = useAnimatedPosition(
    coordinates,
    0,
    TRAIN_UPDATE_FREQ,
    skipAnimation,
  )

  // Extract primitive values so they can be used as effect dependencies
  const lng = coordinates?.[0]
  const lat = coordinates?.[1]

  // Enable subpixel positioning for smoother animations
  // https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MarkerOptions/#subpixelpositioning
  useEffect(() => {
    if (!lng || !lat) {
      return
    }
    markerRef.current?.setSubpixelPositioning(true)
  }, [lng, lat])

  if (!animPosition?.coordinates || zoom < DETAIL_ZOOM_LEVEL) {
    return null
  }

  return (
    <Marker
      longitude={animPosition.coordinates[0]}
      latitude={animPosition.coordinates[1]}
      // apply a very slight rotation to force Firefox to render subpixel `translate`
      // values
      rotation={0.1}
      ref={markerRef}
      onClick={() => navigateToTrain(id)}
      className="cursor-pointer p-2"
      anchor="left"
      offset={[6, 0]}
      style={{
        // 1 layer above the TrainMarker
        zIndex: isSelected ? 1 : 'unset',
      }}
    >
      <span
        className={cn(
          'rounded-full px-2 py-[0.1em] text-sm font-medium brightness-110 backdrop-blur-xs',
          isSelected
            ? 'bg-amtrak-bright-blue-400 text-white'
            : 'border border-white/50 bg-white/35',
        )}
      >
        {name}
        <span
          className={cn('pl-1', {
            'text-amtrak-blue-500': !isSelected,
          })}
        >
          {number}
        </span>
      </span>
    </Marker>
  )
}

export default TrainLabel
