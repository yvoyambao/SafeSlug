import cheerio from 'cheerio'
import fetch from 'node-fetch'

const SHERIFF_URL = 'https://www2.santacruzcountyca.gov/SHF/CristaPublic/CristaPublic?address='

export async function scrapeSheriffCalls() {
  const response = await fetch(SHERIFF_URL)
  const html = await response.text()
  const $ = cheerio.load(html)
  const incidents = []

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 3) return

    incidents.push({
      date: $(cells[0]).text().trim(),
      rawText: $(cells[1]).text().trim(),
      address: $(cells[2]).text().trim()
    })
  })

  return incidents
}
