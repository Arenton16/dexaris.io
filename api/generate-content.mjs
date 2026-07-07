// A thread is numbered beats ("1/", "2/", etc.) separated by blank lines —
// detected from the text itself so this works regardless of which format the
// model actually used, independent of what was requested.
function splitThreadBeats(text) {
  const segments = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  const beatCount = segments.filter(s => /^\d+\//.test(s)).length
  return beatCount >= 2 ? segments : null
}

function truncateAtWordBoundary(text, maxLen = 280) {
  if (text.length <= maxLen) return text
  const ellipsis = '…'
  const limit = maxLen - ellipsis.length
  let truncated = text.slice(0, limit)
  const lastSpace = truncated.lastIndexOf(' ')
  // Only back off to the word boundary if it doesn't discard a large chunk
  // of the text (e.g. one long unbroken token near the start) — otherwise a
  // hard cut at the limit beats truncating away almost everything.
  if (lastSpace > limit * 0.6) truncated = truncated.slice(0, lastSpace)
  return truncated.trim() + ellipsis
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { systemPrompt, userMessage, recentPostTypes } = req.body

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

  // Belt-and-suspenders anti-repetition instruction: the caller already picks
  // the content type/tone for each post in code, but the recent history is
  // also surfaced here so the model actively avoids echoing the phrasing,
  // structure, or angle of what it (or a prior generation) just wrote.
  let effectiveSystemPrompt = `Respond with raw JSON only. No markdown, no code fences, no explanation before or after the JSON.\n\n${systemPrompt}`
  if (Array.isArray(recentPostTypes) && recentPostTypes.length) {
    effectiveSystemPrompt += `\n\nAVOID REPETITION: these post types/tones were used in recent generations — ${recentPostTypes.join(', ')}. Do not repeat the same structure, opening line, or angle as those, even if today's assignment happens to reuse one of these types or tones.`
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2400,
      system: effectiveSystemPrompt,
      messages: [{ role: 'user', content: safeUserMessage }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Anthropic 400 error:', errorBody)
    return res.status(500).json({ error: `Anthropic API error: ${response.status} — ${errorBody}` })
  }

  const data = await response.json()

  // claude-sonnet-5 runs adaptive thinking by default when `thinking` isn't
  // set, so `content[0]` can be a thinking block rather than the text block —
  // find the text block explicitly instead of assuming it's first.
  const textBlock = data.content?.find(block => block.type === 'text')
  const rawText = textBlock?.text || ''

  // Strip markdown code fences — the model occasionally wraps its response in
  // ```json ... ``` (or adds stray commentary around the object) despite the
  // system prompt asking for raw JSON.
  const clean = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch (err) {
    console.error('[generate-content] failed to parse AI response as JSON:', rawText)
    return res.status(200).json({ result: clean })
  }

  // Enforce X's character limits post-generation. Thread beats are checked
  // and capped individually — never as a combined total — while single
  // tweets get a hard 280-character cap regardless of what the model returned.
  if (Array.isArray(parsed.posts)) {
    for (const post of parsed.posts) {
      if (typeof post.text !== 'string') continue

      const beats = splitThreadBeats(post.text)
      if (beats) {
        const cappedBeats = beats.map(beat => truncateAtWordBoundary(beat, 280))
        post.text = cappedBeats.join('\n\n')
        post.chars = Math.max(...cappedBeats.map(b => b.length))
      } else {
        post.text = truncateAtWordBoundary(post.text, 280)
        post.chars = post.text.length
      }
    }
  }

  return res.status(200).json({ result: JSON.stringify(parsed) })
}
