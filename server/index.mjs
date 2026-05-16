import { createClient } from '@supabase/supabase-js'
import { geocodeAddress } from './geocode.js'
import { scrapeSheriffCalls } from './scraper.js'
import { summarizeIncident } from './nemoclaw.js'

const port = Number(process.env.PORT || 8787)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function toIncidentNumber(row, index) {
  return row.incident_number || `${row.address || 'unknown'}-${row.date || index}`
}

async function syncIncidents() {
  const scraped = await scrapeSheriffCalls()
  const rows = []

  for (const [index, row] of scraped.entries()) {
    const summary = await summarizeIncident(row.rawText || row.address || '')
    const geocoded = await geocodeAddress(row.address || row.rawText || '')
    rows.push({
      incident_number: toIncidentNumber(row, index),
      date_text: row.date || null,
      address: row.address || 'Unknown address',
      raw_text: row.rawText || null,
      summary: summary.summary || null,
      severity: summary.severity || 'Medium',
      category: summary.category || 'Other',
      emoji: summary.emoji || 'ℹ️',
      latitude: geocoded?.lat ?? null,
      longitude: geocoded?.lng ?? null,
      geocoded_address: geocoded?.label ?? null,
      inserted_at: new Date().toISOString(),
    })
  }

  const { error } = await supabase.from('santa_cruz_calls').upsert(rows, {
    onConflict: 'incident_number',
  })

  if (error) {
    throw error
  }

  return rows.length
}

const { createServer } = await import('node:http')

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing URL' }))
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (req.method === 'POST' && req.url === '/sync') {
    try {
      const count = await syncIncidents()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, synced: count }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: error.message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

httpServer.listen(port, () => {
  console.log(`SafeSlug backend listening on http://localhost:${port}`)
})
