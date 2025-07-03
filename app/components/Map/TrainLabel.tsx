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
      className="cursor-pointer p-2 transition-all ease-linear"
      anchor="left"
      offset={[6, 0]}
      style={{
        // reposition markers immediately while map is moving
        transitionDuration: moving ? '0s' : '5s',
        zIndex: isSelected ? 1 : 'unset',
      }}
    >
      <span
        className={cn(
          'rounded-full px-2 py-[0.1em] text-sm font-medium backdrop-blur backdrop-brightness-150 transition-all ease-linear',
          isSelected ? 'bg-amtrak-blue-500 text-white' : 'bg-white/50',
        )}
      >
        {routeCode}
        <span
          className={cn('pl-1', {
            'text-amtrak-blue-600': !isSelected,
          })}
        >
          {trainNum}
        </span>
      </span>
    </Marker>
  )
}

export default TrainLabel
