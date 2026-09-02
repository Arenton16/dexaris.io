import crypto from 'node:crypto'
import OAuth from 'oauth-1.0a'

// A thread is numbered beats ("1/", "2/", etc.) separated by blank lines —
// mirrors the same check in generate-content.mjs. Both this tool's post
// generator and its reply generator are instructed to always produce a
// single tweet, so a thread-shaped text here means something drifted from
// spec — refuse to post it rather than publish a garbled first beat.
function looksLikeThread(text) {
  const segments = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  return segments.filter(s => /^\d+\//.test(s)).length >= 2
}

const TWEET_URL_RE = /(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/i

// Accepts a bare numeric ID or a full tweet URL and returns the ID, or null
// if neither pattern matches.
function extractTweetId(input) {
  const trimmed = (input || '').trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(TWEET_URL_RE)
  return match ? match[1] : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // This endpoint publishes to the live @DexarisHQ account — unlike the
  // content-generation endpoint (worst case: burns API credit), an
  // unauthenticated caller here could post arbitrary content as the brand.
  // The Newsletter Generator's password screen is client-side only and does
  // not protect this route, so a separate server-checked secret is required
  // regardless of that gate.
  const posterSecret = req.headers['x-poster-secret']
  if (!process.env.INTERNAL_TOOL_SECRET) {
    return res.status(500).json({ error: 'INTERNAL_TOOL_SECRET is not configured on the server' })
  }
  if (!posterSecret || posterSecret !== process.env.INTERNAL_TOOL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { text, replyToUrl } = req.body

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' })
  }
  if (looksLikeThread(text)) {
    return res.status(400).json({ error: 'This looks like a multi-tweet thread — direct posting only supports a single tweet. Copy/paste it instead.' })
  }
  if (text.length > 280) {
    return res.status(400).json({ error: `Text is ${text.length} characters — over the 280 limit` })
  }

  let replyToId = null
  if (replyToUrl) {
    replyToId = extractTweetId(replyToUrl)
    if (!replyToId) {
      return res.status(400).json({ error: "Couldn't find a tweet ID in that URL — paste the full tweet link (e.g. https://x.com/user/status/123...) or the numeric ID." })
    }
  }

  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return res.status(500).json({ error: 'X API credentials are not configured on the server (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)' })
  }

  const oauth = new OAuth({
    consumer: { key: X_API_KEY, secret: X_API_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64')
    },
  })

  const url = 'https://api.twitter.com/2/tweets'
  const authHeader = oauth.toHeader(
    oauth.authorize({ url, method: 'POST' }, { key: X_ACCESS_TOKEN, secret: X_ACCESS_TOKEN_SECRET })
  )

  const body = replyToId
    ? { text, reply: { in_reply_to_tweet_id: replyToId } }
    : { text }

  const xRes = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const xData = await xRes.json().catch(() => null)

  if (!xRes.ok) {
    console.error('X API post failed:', xRes.status, xData)
    const detail = xData?.detail || xData?.title || JSON.stringify(xData)
    return res.status(502).json({ error: `X API error: ${xRes.status} — ${detail}` })
  }

  const tweetId = xData?.data?.id
  return res.status(200).json({
    id: tweetId,
    url: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
  })
}
