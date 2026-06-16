export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { systemPrompt, userMessage } = req.body

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing systemPrompt or userMessage' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const safeUserMessage = userMessage.length > 20000
    ? userMessage.slice(0, 20000)
    : userMessage

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: safeUserMessage }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Anthropic 400 error:', errorBody)
    return res.status(500).json({ error: `Anthropic API error: ${response.status} — ${errorBody}` })
  }

  const data = await response.json()
  const result = data.content?.[0]?.text || ''
  return res.status(200).json({ result })
}
