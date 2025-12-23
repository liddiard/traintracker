import { Marker } from 'react-map-gl/maplibre'
import cn from 'classnames'
import { TrainFeatureProperties } from '@/app/types'
import { DETAIL_ZOOM_LEVEL } from './constants'

interface TrainLabelProps extends TrainFeatureProperties {
  coordinates: number[] | null
  zoom: number
  moving: boolean
  navigateToTrain: (trainID: string) => void
  name: string
  number: string
  isSelected: boolean
}

function TrainLabel({
  id,
  coordinates,
  zoom,
  moving,
  name,
  number,
  isSelected,
  navigateToTrain,
}: TrainLabelProps) {
  if (!coordinates || zoom < DETAIL_ZOOM_LEVEL) {
    return null
  }
  const [lon, lat] = coordinates
  return (
    <Marker
      longitude={lon}
      latitude={lat}
      onClick={() => navigateToTrain(id)}
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
