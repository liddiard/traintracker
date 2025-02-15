import { Marker } from 'react-map-gl/maplibre'
import Pointer from '@/app/img/pointer.svg'

interface TrainMarkerProps {
  coordinates: number[]
  bearing: number | undefined
}

function TrainMarker({ coordinates, bearing }: TrainMarkerProps) {
  const [lon, lat] = coordinates
  return (
    <Marker longitude={lon} latitude={lat} rotation={bearing}>
      <Pointer className="w-4" />
    </Marker>
  )
}

export default TrainMarker
