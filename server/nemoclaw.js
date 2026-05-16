const fallbackSummary = {
  summary: 'A disturbance was reported in the area and responders are en route.',
  severity: 'Medium',
  category: 'Crime',
  emoji: '🚔',
  location: 'Santa Cruz',
}

export async function summarizeIncident(rawText) {
  const url = globalThis.process?.env?.NEMOCLAW_URL || globalThis.process?.env?.VITE_NEMOCLAW_URL
  const key = globalThis.process?.env?.NEMOCLAW_KEY || globalThis.process?.env?.VITE_NEMOCLAW_KEY

  if (!url || !key) {
    return fallbackSummary
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'nemotron',
      messages: [
        {
          role: 'system',
          content: `You are a public safety AI agent for Santa Cruz.
Decode police codes into plain English.
Return only valid JSON with these fields:
- summary: 1-2 sentence plain English description
- severity: Low, Medium, or High
- category: Crime, Fire, Medical, Traffic, or Other
- emoji: one relevant emoji`,
        },
        {
          role: 'user',
          content: rawText,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('NemoClaw API request failed')
  }

  return response.json()
}
