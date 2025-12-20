import { Marker } from 'react-map-gl/maplibre'
import Pointer from '@/app/img/pointer.svg'
import Circle from '@/app/img/train-circle.svg'
import { TrainFeatureProperties } from '@/app/types'

interface TrainMarkerProps extends TrainFeatureProperties {
  coordinates: number[] | null
  zoom: number
  moving: boolean
  isSelected: boolean
  navigateToTrain: (trainID: string) => void
}

function TrainMarker({
  id,
  color,
  coordinates,
  heading,
  zoom,
  moving,
  isSelected,
  navigateToTrain,
}: TrainMarkerProps) {
  const sharedStyles = {
    scale: `clamp(0.5, ${0.5 + zoom * 0.1}, 1.75)`,
    fill: color,
    stroke: 'white',
    strokeWidth: 5,
  }

  if (!coordinates) {
    return
  }

  return (
    <Marker
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      rotation={heading ?? undefined}
      rotationAlignment="map"
      pitchAlignment="map"
      className="cursor-pointer p-2"
      style={{
        // reposition markers immediately while map is moving
        transition: moving ? 'none' : 'transform 5s linear',
        zIndex: isSelected ? 1 : 'unset',
      }}
      onClick={() => navigateToTrain(id)}
    >
      {heading === null || zoom < 6 ? (
        <Circle className="w-2" style={sharedStyles} />
      ) : (
        <Pointer className="w-4" style={sharedStyles} />
      )}
    </Marker>
  )
}

export default TrainMarker
