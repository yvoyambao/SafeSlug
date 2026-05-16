import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const SANTA_CRUZ_COORDS = [-122.0383, 36.9741]

export default function MiniMap() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN

  useEffect(() => {
    if (!accessToken || mapRef.current) return

    mapboxgl.accessToken = accessToken

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: SANTA_CRUZ_COORDS,
      zoom: 13,
      interactive: false,
    })

    mapRef.current.on('load', () => {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([-122.058, 36.978])
        .addTo(mapRef.current)

      new mapboxgl.Marker({ color: '#f97316' })
        .setLngLat([-122.025, 36.972])
        .addTo(mapRef.current)

      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([-122.042, 36.960])
        .addTo(mapRef.current)

      new mapboxgl.Marker({ color: '#FFC72C' })
        .setLngLat([-122.030, 36.985])
        .addTo(mapRef.current)

      new mapboxgl.Marker({ color: '#a855f7' })
        .setLngLat([-122.065, 36.962])
        .addTo(mapRef.current)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [accessToken])

  if (!accessToken) return null

  return <div ref={containerRef} className="mini-map" />
}
