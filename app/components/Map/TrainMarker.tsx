import { Marker } from 'react-map-gl/maplibre'
import Pointer from '@/app/img/pointer.svg'
import Circle from '@/app/img/train-circle.svg'
import { useRouter } from 'next/navigation'
import { TrainFeatureProperties } from '@/app/types'

interface TrainMarkerProps extends TrainFeatureProperties {
  coordinates: number[]
  bearing?: number
  zoom: number
}

function TrainMarker({
  objectID,
  color,
  coordinates,
  bearing,
  zoom,
}: TrainMarkerProps) {
  const router = useRouter()
  const [lon, lat] = coordinates

  const renderMarker = () => {
    const sharedStyles = {
      scale: 0.5 + zoom * 0.075,
      fill: color,
      cursor: 'pointer',
    }
    if (bearing === undefined || zoom < 6) {
      return <Circle className="w-2" style={sharedStyles} />
    } else {
      return <Pointer className="w-4" style={sharedStyles} />
    }
  }

  return (
    <Marker
      longitude={lon}
      latitude={lat}
      rotation={bearing}
      onClick={() => router.push(`/train/${objectID}`)}
    >
      {renderMarker()}
    </Marker>
  )
}

export default TrainMarker
