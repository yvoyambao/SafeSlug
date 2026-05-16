import * as cheerio from 'cheerio'

const HOME_URL = 'https://www2.santacruzcountyca.gov/SHF/CristaPublic/'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

// Common Santa Cruz streets — searched in parallel to get broad coverage
const SEARCH_TERMS = [
  // Street type suffixes — each matches every street of that type county-wide
  'ST', 'AVE', 'DR', 'BLVD', 'RD', 'LN', 'WAY', 'CT', 'PL', 'CIR',
  // Areas not covered by suffixes
  'HWY', 'GRADE', 'LOOP', 'TRL',
]

async function getSessionToken() {
  const res = await fetch(HOME_URL, { headers: HEADERS })
  if (!res.ok) throw new Error(`Sheriff GET failed with status ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const token = $('input[name="__RequestVerificationToken"]').val()
  if (!token) throw new Error('Could not find CSRF token on Sheriff page')
  const cookies = res.headers.get('set-cookie') || ''
  return { token, cookies }
}

async function searchStreet(street, token, cookies) {
  const body = new URLSearchParams({
    __RequestVerificationToken: token,
    streetAddress: street,
    butSearch: 'Search',
  })

  const res = await fetch(HOME_URL, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': HOME_URL,
      'Cookie': cookies,
    },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Sheriff POST failed for "${street}" with status ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const incidents = []

  $('table.table-bordered tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 6) return
    incidents.push({
      address:         $(cells[0]).text().trim(),
      area:            $(cells[2]).text().trim(),
      date:            $(cells[3]).text().trim(),
      rawText:         $(cells[4]).text().trim(),
      incident_number: $(cells[5]).text().trim(),
    })
  })

  return incidents
}

export async function scrapeSheriffCalls() {
  const { token, cookies } = await getSessionToken()

  const results = await Promise.allSettled(
    SEARCH_TERMS.map(street => searchStreet(street, token, cookies))
  )

  const seen = new Set()
  const incidents = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const inc of result.value) {
      if (!inc.incident_number || seen.has(inc.incident_number)) continue
      seen.add(inc.incident_number)
      incidents.push(inc)
    }
  }

  return incidents
}
