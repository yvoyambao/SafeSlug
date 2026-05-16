import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'
import '../styles/LiveMap.css'

const SANTA_CRUZ_COORDS = [-122.0383, 36.9741]

export default function LiveMap() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const geocodeCacheRef = useRef(new Map())
  const boundsRef = useRef(null)
  const accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN
  const mapError = !accessToken ? 'Missing VITE_MAPBOX_API_TOKEN in your .env file.' : ''
  const [incidents, setIncidents] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [status, setStatus] = useState('Loading incidents from Supabase...')

  useEffect(() => {
    let active = true

    ;(async () => {
      const { data, error } = await supabase
        .from('santa_cruz_calls')
        .select('*')
        .order('inserted_at', { ascending: false })
        .limit(100)

      if (!active) return

      if (error) {
        console.error(error)
        setIncidents([])
        setStatus(`Supabase error: ${error.message}`)
        return
      }

      setIncidents(data || [])
      setStatus(data?.length ? `Loaded ${data.length} incidents from Supabase` : 'No incidents found in Supabase')
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      return undefined
    }

    // Set Mapbox token from environment variables
    mapboxgl.accessToken = accessToken

    // Santa Cruz, CA coordinates
    // Initialize map
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: SANTA_CRUZ_COORDS,
        zoom: 14,
        scrollZoom: true,
        dragPan: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
      })
    } catch (error) {
      console.error(error)
      return undefined
    }

    map.current.on('load', () => {
      setMapReady(true)

      map.current?.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
        }),
        'top-right'
      )

      // Add fullscreen control
      map.current?.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    })

    return () => map.current?.remove()
  }, [accessToken])

  useEffect(() => {
    if (!mapReady || !map.current || !accessToken) return undefined

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    boundsRef.current = new mapboxgl.LngLatBounds()

    let active = true

    const geocodeAddress = async (address) => {
      const key = address.trim().toLowerCase()
      if (!key) return null

      const cached = geocodeCacheRef.current.get(key)
      if (cached) return cached

      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
      )
      url.searchParams.set('access_token', accessToken)
      url.searchParams.set('limit', '1')
      url.searchParams.set('types', 'address,poi,place,locality')
      url.searchParams.set('country', 'us')
      url.searchParams.set('proximity', '-122.0312,36.9741')

      const response = await fetch(url)
      if (!response.ok) return null

      const body = await response.json()
      const feature = body.features?.[0]
      if (!feature?.center) return null

      const result = {
        lng: Number(feature.center[0]),
        lat: Number(feature.center[1]),
        label: feature.place_name,
      }
      geocodeCacheRef.current.set(key, result)
      return result
    }

    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']

    ;(async () => {
      for (const [index, incident] of incidents.slice(0, 50).entries()) {
        if (!active) return

        let coords = null
        let geocodedLabel = incident.geocoded_address || ''
        const incidentType = incident.type || 'Incident'
        const incidentSummary = incident.summary || incident.raw_text || 'No summary available.'

        if (incident.longitude != null && incident.latitude != null) {
          coords = [Number(incident.longitude), Number(incident.latitude)]
        } else if (incident.address) {
          const geocoded = await geocodeAddress(incident.address)
          if (geocoded) {
            coords = [geocoded.lng, geocoded.lat]
            geocodedLabel = geocoded.label
          }
        }

        if (!coords) {
          const seed = (incident.incident_number || incident.address || String(index))
            .split('')
            .reduce((sum, char) => sum + char.charCodeAt(0), 0)
          const lngOffset = ((seed % 100) / 1000) - 0.05
          const latOffset = (((seed >> 1) % 100) / 1000) - 0.05
          coords = [SANTA_CRUZ_COORDS[0] + lngOffset, SANTA_CRUZ_COORDS[1] + latOffset]
        }

        const popupHtml = `
          <strong>${incidentType}</strong>
          <div>${incident.address || 'Unknown address'}</div>
          <div>${incident.area || 'Santa Cruz'}</div>
          <div>${geocodedLabel}</div>
          <div>${incident.incident_number || ''}</div>
          <div>${incidentSummary}</div>
        `

        const marker = new mapboxgl.Marker({ color: colors[index % colors.length] })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
          .addTo(map.current)

        markersRef.current.push(marker)
        boundsRef.current.extend(coords)
      }

      if (!boundsRef.current.isEmpty()) {
        map.current.fitBounds(boundsRef.current, {
          padding: 70,
          maxZoom: 15,
          duration: 700,
        })
      }
    })()

    return () => {
      active = false
    }
  }, [accessToken, incidents, mapReady])

  return (
    <div className="live-map-container">
      <div className="map-header">
        <h1>Live Safety Map</h1>
        <p>Real-time incident reports in Santa Cruz</p>
        <p className="map-status">{status}</p>
      </div>
      {mapError ? (
        <div className="map-error">
          <h2>Map unavailable</h2>
          <p>{mapError}</p>
          <p>Restore the token and reload to see incident markers again.</p>
        </div>
      ) : (
        <div ref={mapContainer} className="map-container" />
      )}
    </div>
  )
}
