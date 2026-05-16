import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import '../styles/LiveMap.css'

export default function LiveMap() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    // Set Mapbox token from environment variables
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN

    // Santa Cruz, CA coordinates
    const santaCruzCoords = [-122.0383, 36.9741]

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: santaCruzCoords,
      zoom: 14,
      scrollZoom: true,
      dragPan: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
    })

    // Add navigation controls (zoom, compass, fullscreen)
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
      }),
      'top-right'
    )

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    // Add marker for Santa Cruz downtown
    new mapboxgl.Marker({ color: '#FF0000' })
      .setLngLat(santaCruzCoords)
      .setPopup(new mapboxgl.Popup().setHTML('<h3>Santa Cruz, CA</h3>'))
      .addTo(map.current)

    // Add UCSC campus marker
    const ucscCoords = [-122.0563, 37.0041]
    new mapboxgl.Marker({ color: '#0000FF' })
      .setLngLat(ucscCoords)
      .setPopup(new mapboxgl.Popup().setHTML('<h3>UC Santa Cruz</h3>'))
      .addTo(map.current)

    return () => map.current?.remove()
  }, [])

  return (
    <div className="live-map-container">
      <div className="map-header">
        <h1>Live Safety Map</h1>
        <p>Real-time incident reports in Santa Cruz</p>
      </div>
      <div ref={mapContainer} className="map-container"></div>
    </div>
  )
}
