import { Marker } from 'react-map-gl/maplibre'
import Pointer from '@/app/img/pointer.svg'
import Circle from '@/app/img/train-circle.svg'
import { TrainFeatureProperties } from '@/app/types'

interface TrainMarkerProps extends TrainFeatureProperties {
  coordinates: number[]
  bearing?: number
  zoom: number
  navigateToTrain: (trainID: string) => void
}

function TrainMarker({
  objectID,
  color,
  coordinates,
  bearing,
  zoom,
  navigateToTrain,
}: TrainMarkerProps) {
  const [lon, lat] = coordinates

  const renderMarker = () => {
    const sharedStyles = {
      scale: `clamp(0.5, ${0.5 + zoom * 0.1}, 1.75)`,
      fill: color,
      stroke: 'white',
      strokeWidth: 5,
    }
    return bearing === undefined || zoom < 6 ? (
      <Circle className="w-2" style={sharedStyles} />
    ) : (
      <Pointer className="w-4" style={sharedStyles} />
    )
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
    >
      {renderMarker()}
    </Marker>
  )
}

export default TrainMarker
