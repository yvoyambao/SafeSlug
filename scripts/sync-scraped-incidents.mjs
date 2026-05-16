import { createClient } from '@supabase/supabase-js'
import { scrapeSheriffCalls } from '../src/services/scraper.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const mapboxToken = process.env.MAPBOX_GEOCODING_TOKEN || process.env.VITE_MAPBOX_API_TOKEN

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const geocodeCache = new Map()

function toIncidentNumber(row, index) {
  return row.incident_number || `${row.address || 'unknown'}-${row.date || index}`
}

async function geocodeAddress(address) {
  const key = address.trim().toLowerCase()
  if (!key) return null
  if (geocodeCache.has(key)) return geocodeCache.get(key)
  if (!mapboxToken) return null

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
  )
  url.searchParams.set('access_token', mapboxToken)
  url.searchParams.set('limit', '1')
  url.searchParams.set('types', 'address,poi,place,locality')
  url.searchParams.set('country', 'us')
  url.searchParams.set('proximity', '-122.0312,36.9741')

  const response = await fetch(url)
  if (!response.ok) return null

  const body = await response.json()
  const feature = body.features?.[0]
  if (!feature?.center) return null

  const [lng, lat] = feature.center
  const result = { lat, lng, geocoded_address: feature.place_name }
  geocodeCache.set(key, result)
  return result
}

async function main() {
  const scraped = await scrapeSheriffCalls()

  const rows = []

  for (const [index, row] of scraped.entries()) {
    const geocoded = await geocodeAddress(row.address || row.rawText || '')
    rows.push({
      incident_number: toIncidentNumber(row, index),
      address: row.address || 'Unknown address',
      area: row.area || 'Santa Cruz',
      type: row.type || 'Incident',
      inserted_at: row.inserted_at || new Date().toISOString(),
      latitude: geocoded?.lat ?? null,
      longitude: geocoded?.lng ?? null,
      geocoded_address: geocoded?.geocoded_address ?? null,
    })
  }

  const { error } = await supabase
    .from('santa_cruz_calls')
    .upsert(rows, { onConflict: 'incident_number' })

  if (error) {
    throw error
  }

  console.log(`Synced ${rows.length} incidents into santa_cruz_calls`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
