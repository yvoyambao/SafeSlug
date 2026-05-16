export async function chatAboutSafety(userMessage, incidents = []) {
  const url = globalThis.process?.env?.NEMOCLAW_URL || globalThis.process?.env?.VITE_NEMOCLAW_URL
  const key = globalThis.process?.env?.NEMOCLAW_KEY || globalThis.process?.env?.VITE_NEMOCLAW_KEY

  if (!url || !key) return "I'm unable to connect to the AI right now. Please try again later."

  const context = incidents.length
    ? incidents.map(i => `- ${i.date_text || ''} | ${i.address} | ${i.category} | ${i.summary}`).join('\n')
    : 'No recent incidents available.'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are SafeSlug, a safety assistant for UCSC students.
Answer in 1-3 short sentences. Be direct and plain. No bullet points, no headers, no fluff.
Only use incidents from the list below. If nothing relevant, say the area looks calm right now.

Recent incidents:
${context}`,
          },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 150,
        chat_template_kwargs: { enable_thinking: false },
      }),
    })

    clearTimeout(timeout)
    if (!response.ok) return "Sorry, I couldn't get a response right now."

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    return content || "Sorry, I couldn't get a response right now."
  } catch {
    clearTimeout(timeout)
    return "Request timed out. Please try again."
  }
}

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

  if (!url || !key) return fallbackSummary

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
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
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 65536,
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) return fallbackSummary

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const content = message?.content || message?.reasoning_content || null

    if (!content) return fallbackSummary

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallbackSummary

    return JSON.parse(jsonMatch[0])
  } catch {
    clearTimeout(timeout)
    return fallbackSummary
  }
}
