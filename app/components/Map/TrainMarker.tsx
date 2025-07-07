import { Marker } from 'react-map-gl/maplibre'
import Pointer from '@/app/img/pointer.svg'
import Circle from '@/app/img/train-circle.svg'
import { TrainFeatureProperties } from '@/app/types'

interface TrainMarkerProps extends TrainFeatureProperties {
  coordinates: number[]
  bearing?: number
  zoom: number
  moving: boolean
  isSelected: boolean
  navigateToTrain: (trainID: string) => void
}

function TrainMarker({
  objectID,
  color,
  coordinates,
  bearing,
  zoom,
  moving,
  isSelected,
  navigateToTrain,
}: TrainMarkerProps) {
  const [lon, lat] = coordinates

  const sharedStyles = {
    scale: `clamp(0.5, ${0.5 + zoom * 0.1}, 1.75)`,
    fill: color,
    stroke: 'white',
    strokeWidth: 5,
  }

  return (
    <Marker
      longitude={lon}
      latitude={lat}
      rotation={bearing}
      rotationAlignment="map"
      pitchAlignment="map"
      onClick={() => navigateToTrain(objectID)}
      className="cursor-pointer p-2"
      style={{
        // reposition markers immediately while map is moving
        transition: `transform ${moving ? '0s' : '5s'} linear`,
        zIndex: isSelected ? 1 : 'unset',
      }}
    >
      {bearing === undefined || zoom < 6 ? (
        <Circle className="w-2" style={sharedStyles} />
      ) : (
        <Pointer className="w-4" style={sharedStyles} />
      )}
    </Marker>
  )
}

export default TrainMarker
