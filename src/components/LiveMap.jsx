import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '../lib/supabase'
import '../styles/LiveMap.css'

const SANTA_CRUZ_COORDS = [-122.0383, 36.9741]

const TYPE_COLORS = {
  traffic:    '#3b82f6',
  fire:       '#ef4444',
  medical:    '#f97316',
  disturbance:'#a855f7',
  theft:      '#ec4899',
  assault:    '#dc2626',
  suspicious: '#eab308',
  other:      '#10b981',
}

function categorizeType(type = '') {
  const t = type.toLowerCase()
  if (t.includes('traffic') || t.includes('collision') || t.includes('vehicle') || t.includes('accident')) return 'traffic'
  if (t.includes('fire') || t.includes('smoke') || t.includes('burn')) return 'fire'
  if (t.includes('medical') || t.includes('ambulance') || t.includes('injury') || t.includes('ems')) return 'medical'
  if (t.includes('disturbance') || t.includes('noise') || t.includes('fight')) return 'disturbance'
  if (t.includes('theft') || t.includes('burglary') || t.includes('robbery') || t.includes('stolen')) return 'theft'
  if (t.includes('assault') || t.includes('battery') || t.includes('attack')) return 'assault'
  if (t.includes('suspicious') || t.includes('trespass')) return 'suspicious'
  return 'other'
}

const CATEGORY_LABELS = {
  traffic:     'Traffic',
  fire:        'Fire',
  medical:     'Medical',
  disturbance: 'Disturbance',
  theft:       'Theft',
  assault:     'Assault',
  suspicious:  'Suspicious',
  other:       'Other',
}

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
  const [status, setStatus] = useState('Loading incidents...')
  const [activeFilter, setActiveFilter] = useState('all')
  const [availableCategories, setAvailableCategories] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})

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
        setStatus(`Error: ${error.message}`)
        return
      }

      const incidents = data || []
      setIncidents(incidents)
      setStatus(incidents.length ? `${incidents.length} incidents loaded` : 'No incidents found')

      const cats = [...new Set(incidents.map(i => categorizeType(i.type)))]
      setAvailableCategories(cats)
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!accessToken) return undefined
    mapboxgl.accessToken = accessToken
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: SANTA_CRUZ_COORDS,
        zoom: 13,
        scrollZoom: true,
        dragPan: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
      })
    } catch (e) {
      console.error(e)
      return undefined
    }

    map.current.on('load', () => {
      setMapReady(true)
      map.current?.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
      map.current?.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    })

    return () => map.current?.remove()
  }, [accessToken])

  useEffect(() => {
    if (!mapReady || !map.current || !accessToken) return undefined

    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []
    boundsRef.current = new mapboxgl.LngLatBounds()

    let active = true

    const geocodeAddress = async (address) => {
      const key = address.trim().toLowerCase()
      if (!key) return null
      const cached = geocodeCacheRef.current.get(key)
      if (cached) return cached

      const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`)
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

      const result = { lng: Number(feature.center[0]), lat: Number(feature.center[1]), label: feature.place_name }
      geocodeCacheRef.current.set(key, result)
      return result
    }

    ;(async () => {
      for (const [index, incident] of incidents.slice(0, 50).entries()) {
        if (!active) return

        let coords = null
        let geocodedLabel = incident.geocoded_address || ''
        const incidentType = incident.type || 'Incident'
        const incidentSummary = incident.summary || incident.raw_text || 'No summary available.'
        const category = categorizeType(incidentType)
        const color = TYPE_COLORS[category]

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
            .split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
          coords = [
            SANTA_CRUZ_COORDS[0] + ((seed % 100) / 1000) - 0.05,
            SANTA_CRUZ_COORDS[1] + (((seed >> 1) % 100) / 1000) - 0.05,
          ]
        }

        const popupHtml = `
          <div class="map-popup">
            <span class="popup-category" style="background:${color}22;color:${color};border-color:${color}44">${CATEGORY_LABELS[category]}</span>
            <strong class="popup-type">${incidentType}</strong>
            <p class="popup-address">${incident.address || 'Unknown address'} · ${incident.area || 'Santa Cruz'}</p>
            <p class="popup-summary">${incidentSummary}</p>
            ${incident.incident_number ? `<span class="popup-id">#${incident.incident_number}</span>` : ''}
          </div>
        `

        const marker = new mapboxgl.Marker({ color })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ maxWidth: '280px' }).setHTML(popupHtml))
          .addTo(map.current)

        markersRef.current.push({ marker, category })
        boundsRef.current.extend(coords)
      }

      map.current.flyTo({
        center: SANTA_CRUZ_COORDS,
        zoom: 13,
        duration: 800,
      })

      const counts = {}
      markersRef.current.forEach(({ category }) => {
        counts[category] = (counts[category] || 0) + 1
      })
      setCategoryCounts(counts)
    })()

    return () => { active = false }
  }, [accessToken, incidents, mapReady])

  // Show/hide markers when filter changes
  useEffect(() => {
    markersRef.current.forEach(({ marker, category }) => {
      const el = marker.getElement()
      el.style.display = (activeFilter === 'all' || activeFilter === category) ? 'block' : 'none'
    })
  }, [activeFilter])

  const visibleCount = activeFilter === 'all'
    ? markersRef.current.length
    : markersRef.current.filter(m => m.category === activeFilter).length

  return (
    <div className="live-map-container">
      <div className="map-header">
        <div className="map-header-top">
          <div>
            <h1>Live Safety Map</h1>
            <p>Real-time incident reports in Santa Cruz</p>
          </div>
          <span className="map-status-badge">{status}</span>
        </div>

        <div className="filter-bar">
          <button
            className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
            <span className="filter-count">{Object.values(categoryCounts).reduce((a, b) => a + b, 0)}</span>
          </button>

          {availableCategories.map(cat => (
            <button
              key={cat}
              className={`filter-chip ${activeFilter === cat ? 'active' : ''}`}
              style={{ '--chip-color': TYPE_COLORS[cat] }}
              onClick={() => setActiveFilter(cat)}
            >
              <span className="filter-dot" style={{ background: TYPE_COLORS[cat] }} />
              {CATEGORY_LABELS[cat]}
              <span className="filter-count">{categoryCounts[cat] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {mapError ? (
        <div className="map-error">
          <h2>Map unavailable</h2>
          <p>{mapError}</p>
        </div>
      ) : (
        <div ref={mapContainer} className="map-container" />
      )}
    </div>
  )
}
