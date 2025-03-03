import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import Crosshair from '@/app/img/crosshair.svg'
import { formatTime } from '@/app/utils'

interface TrainGPSProps {
  coordinates: number[]
  updatedAt: Date
}

function TrainGPS({ coordinates, updatedAt }: TrainGPSProps) {
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
        <Crosshair className="h-6 w-6 animate-spin fill-amtrak-indigo-600 [animation-duration:20s]" />
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-sm font-semibold text-amtrak-indigo-600">
          {formatTime(updatedAt)}
        </div>
      </Marker>
      {showPopup && (
        <Popup
          longitude={lon}
          latitude={lat}
          anchor="bottom"
          offset={[0, -10]}
          closeButton={false}
          closeOnClick={false}
          className="text-sm"
        >
          Last reported location
        </Popup>
      )}
    </div>
  )
}

export default TrainGPS
