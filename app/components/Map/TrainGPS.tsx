import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import cn from 'classnames'
import Crosshair from '@/app/img/crosshair.svg'
import { inter } from '@/app/constants'

interface TrainGPSProps {
  coordinates: number[]
  zoom: number
  shortcode: string
}

function TrainGPS({ coordinates, zoom, shortcode }: TrainGPSProps) {
  const [lon, lat] = coordinates
  const [showPopup, setShowPopup] = useState(false)

  return (
    <div
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      <Marker
        longitude={lon}
        latitude={lat}
        anchor="center"
        className="cursor-default mix-blend-hard-light"
      >
        <Crosshair
          className="fill-amtrak-blue-600 h-6 w-6 animate-spin [animation-duration:20s]"
          style={{
            scale: `clamp(0.5, ${zoom * 0.1}, 1)`,
          }}
        />
      </Marker>
      {showPopup && (
        <Popup
          longitude={lon}
          latitude={lat}
          anchor="bottom"
          offset={[0, -10]}
          closeButton={false}
          closeOnClick={false}
          className={cn(inter.className, 'text-sm')}
        >
          {shortcode}’s last-reported location
        </Popup>
      )}
    </div>
  )
}

export default TrainGPS
