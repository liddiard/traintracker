import { Marker } from 'react-map-gl/maplibre'
import cn from 'classnames'
import { TrainFeatureProperties } from '@/app/types'

interface TrainLabelProps extends TrainFeatureProperties {
  coordinates: number[]
  zoom: number
  moving: boolean
  navigateToTrain: (trainID: string) => void
  routeCode: string
  trainNum: string
  isSelected: boolean
}

function TrainLabel({
  objectID,
  coordinates,
  zoom,
  moving,
  routeCode,
  trainNum,
  isSelected,
  navigateToTrain,
}: TrainLabelProps) {
  const [lon, lat] = coordinates

  if (zoom < 6) {
    return null
  }
  return (
    <Marker
      longitude={lon}
      latitude={lat}
      onClick={() => navigateToTrain(objectID)}
      className="cursor-pointer p-2"
      anchor="left"
      offset={[6, 0]}
      style={{
        // reposition markers immediately while map is moving
        transition: moving ? 'none' : 'transform 5s linear',
        // 1 layer above the TrainMarker
        zIndex: isSelected ? 2 : 'unset',
      }}
    >
      <span
        className={cn(
          'rounded-full px-2 py-[0.1em] text-sm font-medium backdrop-blur backdrop-brightness-150',
          isSelected ? 'bg-amtrak-bright-blue-400 text-white' : 'bg-white/50',
        )}
      >
        {routeCode}
        <span
          className={cn('pl-1', {
            'text-amtrak-blue-500': !isSelected,
          })}
        >
          {trainNum}
        </span>
      </span>
    </Marker>
  )
}

export default TrainLabel
