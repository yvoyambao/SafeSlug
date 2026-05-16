const geocodeCache = new Map()

export async function geocodeAddress(address) {
  const mapboxToken = globalThis.process?.env?.MAPBOX_GEOCODING_TOKEN || globalThis.process?.env?.VITE_MAPBOX_API_TOKEN
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
  const result = { lat, lng, label: feature.place_name }
  geocodeCache.set(key, result)
  return result
}
