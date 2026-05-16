import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ReportForm from './ReportForm'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_TOKEN

async function geocodeLocation(location) {
  if (!location || !MAPBOX_TOKEN) return null
  const query = location.toLowerCase().includes('santa cruz') ? location : `${location}, Santa Cruz, CA`
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '1')
  url.searchParams.set('proximity', '-122.0312,36.9741')
  url.searchParams.set('country', 'us')
  const res = await fetch(url)
  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature?.center) return null
  return { lng: feature.center[0], lat: feature.center[1] }
}

const NVIDIA_KEY = import.meta.env.VITE_NEMOCLAW_KEY
const SEVERITY_COLORS = { High: '#ef4444', Medium: '#f97316', Low: '#10b981' }

async function enhanceReport(title, description, category, severity) {
  try {
    const res = await fetch('/nvidia-api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_KEY}` },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a public safety assistant for Santa Cruz.
A community member submitted a safety report. Write a clean 1-2 sentence summary of it in plain English.
Be factual and concise. No fluff.`,
          },
          {
            role: 'user',
            content: `Title: ${title}\nDescription: ${description}\nCategory: ${category}\nSeverity: ${severity}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 100,
        chat_template_kwargs: { enable_thinking: false },
      }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || null
    if (!raw) return null
    return raw.replace(/[\}\]]+$/, '').replace(/^\s*[\{\[]+/, '').trim()
  } catch {
    return null
  }
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function CommunityFeed() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function loadReports() {
    const { data } = await supabase
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setReports(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadReports()

    const channel = supabase
      .channel('realtime:community_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reports' }, () => {
        loadReports()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function handleSubmit({ title, description, category, severity, location, coords }) {
    setSubmitting(true)
    try {
      const [enhanced_summary, geocoded] = await Promise.all([
        enhanceReport(title, description, category, severity),
        coords ? Promise.resolve(coords) : geocodeLocation(location),
      ])

      await supabase.from('community_reports').insert({
        title,
        description,
        enhanced_summary,
        category,
        severity,
        location: location || null,
        latitude: geocoded?.lat ?? null,
        longitude: geocoded?.lng ?? null,
      })

      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="community-page">
      <section className="community-hero scroll-animate visible">
        <p className="eyebrow">Community Feed</p>
        <h1>Recent local updates</h1>
        <p>Live reports from UCSC-area users. Submit your own to keep the community informed.</p>
      </section>

      <div className="community-layout">
        <section className="community-feed">
          {loading && <p className="feed-empty">Loading reports...</p>}
          {!loading && reports.length === 0 && (
            <p className="feed-empty">No reports yet. Be the first to submit one.</p>
          )}
          {reports.map(r => (
            <article key={r.id} className="report-item scroll-animate visible">
              <div className="report-header">
                <span className="report-category" style={{ color: SEVERITY_COLORS[r.severity] || '#64748b' }}>
                  {r.category} · {r.severity}
                </span>
                <span className="report-time">{timeAgo(r.created_at)}</span>
              </div>
              <p className="report-title">{r.title}</p>
              <p className="report-location">{r.location || 'Santa Cruz'}</p>
              <p>{r.enhanced_summary || r.description}</p>
            </article>
          ))}
        </section>

        <aside className="community-sidebar">
          {submitted && <p className="submit-success">✓ Report submitted!</p>}
          <ReportForm onSubmit={handleSubmit} submitting={submitting} />
        </aside>
      </div>
    </main>
  )
}
