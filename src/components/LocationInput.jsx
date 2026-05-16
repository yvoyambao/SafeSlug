import { useState, useRef, useEffect } from 'react'
import '../styles/LocationInput.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_TOKEN

export default function LocationInput({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e) {
    const text = e.target.value
    onChange(text)

    clearTimeout(debounceRef.current)
    if (!text.trim()) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const query = text.toLowerCase().includes('santa cruz') ? text : `${text}, Santa Cruz, CA`
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
        url.searchParams.set('access_token', MAPBOX_TOKEN)
        url.searchParams.set('limit', '5')
        url.searchParams.set('proximity', '-122.0312,36.9741')
        url.searchParams.set('country', 'us')
        url.searchParams.set('types', 'address,poi,place,neighborhood,locality')

        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(data.features || [])
        setOpen(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  function handleSelect(feature) {
    const [lng, lat] = feature.center
    onChange(feature.place_name)
    onSelect({ lat, lng, label: feature.place_name })
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="location-input-wrapper" ref={wrapperRef}>
      <input
        className="location-input"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder || 'Search for a location...'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="location-suggestions">
          {suggestions.map(f => (
            <li key={f.id} onMouseDown={() => handleSelect(f)}>
              <span className="suggestion-main">{f.text}</span>
              <span className="suggestion-sub">{f.place_name.replace(f.text + ', ', '')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
