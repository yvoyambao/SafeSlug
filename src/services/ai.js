export async function summarizeIncident(rawText) {
  if (!import.meta.env.VITE_NEMOCLAW_URL || !import.meta.env.VITE_NEMOCLAW_KEY) {
    return {
      summary: 'A disturbance was reported in the area and responders are en route.',
      severity: 'Medium',
      category: 'Crime',
      emoji: '🚔',
      location: 'Santa Cruz'
    }
  }

  const response = await fetch(import.meta.env.VITE_NEMOCLAW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_NEMOCLAW_KEY}`
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
            - emoji: one relevant emoji`
        },
        {
          role: 'user',
          content: rawText
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error('NemoClaw API request failed')
  }

  const body = await response.json()
  return body
}
