import type { VercelRequest, VercelResponse } from '@vercel/node';

// Read the full request body, handling both pre-parsed (object) and raw-stream cases
async function readBody(req: VercelRequest): Promise<Record<string, unknown>> {
  // @vercel/node v4 pre-parses JSON bodies into req.body
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;

  // v5+ may expose the raw stream — read and parse it manually
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch (err) {
    console.error('Body parse error:', err);
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  const { systemPrompt, userMessage } = body;
  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'systemPrompt and userMessage are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: String(systemPrompt),
        messages: [{ role: 'user', content: String(userMessage) }],
      }),
    });

    const responseText = await aiRes.text();

    if (!aiRes.ok) {
      console.error('Anthropic error:', aiRes.status, responseText);
      // Surface the actual Anthropic error so it's visible in the client
      let detail = `Anthropic API error ${aiRes.status}`;
      try {
        const parsed = JSON.parse(responseText);
        if (parsed?.error?.message) detail = parsed.error.message;
      } catch { /* responseText wasn't JSON */ }
      return res.status(502).json({ error: detail });
    }

    const data = JSON.parse(responseText);
    const result: string = data.content?.[0]?.text ?? '';
    return res.status(200).json({ result });

  } catch (err) {
    console.error('generate-content error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
