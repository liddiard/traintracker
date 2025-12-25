import { useEffect, useRef, useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import { Marker as MarkerType } from 'maplibre-gl'
import cn from 'classnames'
import Crosshair from '@/app/img/crosshair.svg'
import { inter } from '@/app/constants'
import { TrainFeatureProperties } from '@/app/types'

interface TrainGPSProps extends TrainFeatureProperties {
  zoom: number
}

function TrainGPS({ gpsCoordinates, zoom, shortcode }: TrainGPSProps) {
  const [showPopup, setShowPopup] = useState(false)
  const markerRef = useRef<MarkerType>(null)

  // https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MarkerOptions/#subpixelpositioning
  useEffect(() => {
    if (!gpsCoordinates) {
      return
    }
    markerRef.current?.setSubpixelPositioning(true)
  }, [gpsCoordinates])

  if (!gpsCoordinates) {
    return null
  }

  const [lon, lat] = gpsCoordinates

  return (
    <div
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      <Marker
        longitude={lon}
        latitude={lat}
        // apply a very slight rotation to force Firefox to render subpixel `translate`
        // values
        rotation={0.1}
        anchor="center"
        ref={markerRef}
        className="cursor-default mix-blend-hard-light"
      >
        <Crosshair
          className="text-amtrak-blue-600 h-6 w-6 animate-spin [animation-duration:20s]"
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
          className={cn(inter.className, 'z-10 text-sm')}
        >
          {shortcode}’s last-reported location
        </Popup>
      )}
    </div>
  )
}

export default TrainGPS
