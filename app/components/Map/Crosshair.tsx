import { useEffect, useRef, useState, memo } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import { Marker as MarkerType } from 'maplibre-gl'
import cn from 'classnames'
import Crosshair from '@/app/img/crosshair.svg'
import { inter } from '@/app/constants'
import { coordsAreEqual, zoomIsEffectivelyEqual } from './utils'

interface TrainGPSProps {
  gpsCoordinates: number[]
  zoom: number
  // shortcode is optional and not present when crosshair is used to identify a station
  // (as opposed to a train)
  shortcode?: string
}

function CrosshairInner({ gpsCoordinates, zoom, shortcode }: TrainGPSProps) {
  const [showPopup, setShowPopup] = useState(false)
  const markerRef = useRef<MarkerType>(null)

  useEffect(() => {
    if (!gpsCoordinates) {
      return
    }
    // https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MarkerOptions/#subpixelpositioning
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
      {shortcode && showPopup && (
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

const CrosshairComponent = memo(CrosshairInner, (prevProps, nextProps) => {
  // Re-render if specific props changed
  if (prevProps.shortcode !== nextProps.shortcode) {
    return false
  }

  // Re-render if coordinates changed
  if (!coordsAreEqual(prevProps.gpsCoordinates, nextProps.gpsCoordinates)) {
    return false
  }

  // Skip re-render if zoom change is below threshold
  return zoomIsEffectivelyEqual(prevProps.zoom, nextProps.zoom)
})

export default CrosshairComponent
