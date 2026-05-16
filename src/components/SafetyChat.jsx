import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/SafetyChat.css'

const NVIDIA_KEY = import.meta.env.VITE_NEMOCLAW_KEY
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_TOKEN
const SANTA_CRUZ_CENTER = [-122.0312, 36.9741]

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function geocodePlace(query) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ', Santa Cruz, CA')}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '1')
  url.searchParams.set('proximity', SANTA_CRUZ_CENTER.join(','))
  url.searchParams.set('country', 'us')

  const res = await fetch(url)
  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature?.center) return null
  return { lng: feature.center[0], lat: feature.center[1], name: feature.place_name }
}

async function askNemoClaw(userMessage) {
  const [{ data: allIncidents }, { data: communityReports }] = await Promise.all([
    supabase
      .from('santa_cruz_calls')
      .select('date_text, address, category, summary, latitude, longitude')
      .order('inserted_at', { ascending: false })
      .limit(100),
    supabase
      .from('community_reports')
      .select('created_at, location, category, severity, title, enhanced_summary, latitude, longitude')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  let incidents = allIncidents || []
  let reports = communityReports || []
  let locationContext = ''

  const place = await geocodePlace(userMessage).catch(() => null)
  if (place && place.lat && place.lng) {
    const nearbyIncidents = incidents.filter(i =>
      i.latitude && i.longitude && haversineKm(place.lat, place.lng, i.latitude, i.longitude) <= 2
    )

    // For reports: match by proximity if coords exist, OR by location text if they don't
    const placeKeywords = place.name.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3)
    const nearbyReports = reports.filter(r => {
      if (r.latitude && r.longitude) {
        return haversineKm(place.lat, place.lng, r.latitude, r.longitude) <= 2
      }
      // fallback: check if report location text mentions any keyword from the place
      const loc = (r.location || '').toLowerCase()
      return placeKeywords.some(kw => loc.includes(kw))
    })

    incidents = nearbyIncidents
    reports = nearbyReports
    locationContext = `The user is asking about: ${place.name} (${nearbyIncidents.length} official incidents, ${nearbyReports.length} community reports found).`
  } else {
    // No specific location detected — include all reports so chatbot has full context
    locationContext = `No specific location detected. Using all recent data (${incidents.length} incidents, ${reports.length} community reports).`
  }

  const today = new Date().toLocaleDateString('en-US')
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-US')

  const todayIncidents = incidents.filter(i => i.date_text && new Date(i.date_text).toLocaleDateString('en-US') === today)
  const yesterdayIncident = incidents.find(i => i.date_text && new Date(i.date_text).toLocaleDateString('en-US') === yesterday)

  const todayReports = reports.filter(r => r.created_at && new Date(r.created_at).toLocaleDateString('en-US') === today)
  const yesterdayReport = reports.find(r => r.created_at && new Date(r.created_at).toLocaleDateString('en-US') === yesterday)

  const sheriffToday = todayIncidents.slice(0, 10).map(i => `[TODAY-SHERIFF] ${i.date_text} | ${i.address} | ${i.category} | ${i.summary}`).join('\n')
  const communityToday = todayReports.slice(0, 5).map(r => `[TODAY-COMMUNITY ${r.severity?.toUpperCase()}] ${r.created_at?.slice(0, 10)} | ${r.location || 'Santa Cruz'} | ${r.category} | ${r.enhanced_summary || r.title}`).join('\n')
  const yesterdayLine = yesterdayIncident
    ? `[YESTERDAY] ${yesterdayIncident.date_text} | ${yesterdayIncident.address} | ${yesterdayIncident.category} | ${yesterdayIncident.summary}`
    : yesterdayReport
    ? `[YESTERDAY-COMMUNITY] ${yesterdayReport.location || 'Santa Cruz'} | ${yesterdayReport.category} | ${yesterdayReport.enhanced_summary || yesterdayReport.title}`
    : ''

  const context = [sheriffToday, communityToday, yesterdayLine].filter(Boolean).join('\n') || 'No incidents or reports found for today in this area.'

  const res = await fetch('/nvidia-api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_KEY}` },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      messages: [
        {
          role: 'system',
          content: `You are SafeSlug, a friendly safety assistant for UCSC students and Santa Cruz residents.
Answer in 3-5 sentences. Be conversational and helpful. No bullet points or headers.
Focus only on TODAY's data tagged [TODAY-SHERIFF] or [TODAY-COMMUNITY].
If no incidents today, clearly say the area looks safe right now.
You may mention at most one [YESTERDAY] event as brief background context.
Always end with a short practical safety tip.
${locationContext}

Data:
${context}`,
        },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 300,
      chat_template_kwargs: { enable_thinking: false },
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response."
}

export default function SafetyChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm SafeSlug AI. Ask me anything about safety in Santa Cruz — try asking about a specific place like Porter College or Pacific Ave." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const reply = await askNemoClaw(text)
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Couldn't connect to the AI. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="safety-chat">
      <button className="chat-toggle" onClick={() => setOpen(o => !o)} title="Ask SafeSlug AI">
        {open ? '✕' : '🛡️'}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>🛡️ SafeSlug AI</span>
            <span className="chat-subtitle">Powered by NemoClaw</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble assistant loading">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Is it safe near Porter College?"
              disabled={loading}
            />
            <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
