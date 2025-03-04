import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import Crosshair from '@/app/img/crosshair.svg'

interface TrainGPSProps {
  coordinates: number[]
  zoom: number
}

function TrainGPS({ coordinates, zoom }: TrainGPSProps) {
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
          className="h-6 w-6 animate-spin fill-amtrak-blue-700 [animation-duration:20s]"
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
          className="text-sm"
        >
          Last reported location
        </Popup>
      )}
    </div>
  )
}

export default TrainGPS
