import { createClient } from '@supabase/supabase-js'
import { geocodeAddress } from './geocode.js'
import { scrapeSheriffCalls } from './scraper.js'
import { summarizeIncident, chatAboutSafety } from './nemoclaw.js'

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

  const sorted = scraped
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const limited = []
  let dayOffset = 0
  while (limited.length < 50 && dayOffset <= 30) {
    const target = new Date()
    target.setDate(target.getDate() - dayOffset)
    const targetDate = target.toLocaleDateString('en-US')

    const dayIncidents = sorted.filter(r => {
      const d = new Date(r.date)
      return d.toLocaleDateString('en-US') === targetDate
    })

    limited.push(...dayIncidents)
    dayOffset++
  }

  const final = limited.slice(0, 50)
  console.log(`Scraped ${scraped.length} incidents, processing ${final.length} (going back ${dayOffset - 1} day(s))...`)
  const rows = []

  for (const [index, row] of final.entries()) {
    console.log(`[${index + 1}/${final.length}] ${row.rawText || row.address}`)
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
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ ok: true, synced: count }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: error.message }))
    }
    return
  }

  if (req.method === 'POST' && req.url === '/chat') {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', chunk => { data += chunk })
        req.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
        })
        req.on('error', reject)
      })

      const { message } = body
      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing message' }))
        return
      }

      const { data: incidents } = await supabase
        .from('santa_cruz_calls')
        .select('date_text, address, category, summary')
        .order('inserted_at', { ascending: false })
        .limit(20)

      const reply = await chatAboutSafety(message, incidents || [])
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ reply }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
    res.end()
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

httpServer.listen(port, async () => {
  console.log(`SafeSlug backend listening on http://localhost:${port}`)

  // Run an initial sync on startup
  try {
    const count = await syncIncidents()
    console.log(`Initial sync complete — ${count} incidents saved.`)
  } catch (err) {
    console.error('Initial sync failed:', err.message)
  }

  // Auto-sync every 5 minutes
  setInterval(async () => {
    console.log('Auto-sync starting...')
    try {
      const count = await syncIncidents()
      console.log(`Auto-sync complete — ${count} incidents saved.`)
    } catch (err) {
      console.error('Auto-sync failed:', err.message)
    }
  }, SYNC_INTERVAL_MS)
})
