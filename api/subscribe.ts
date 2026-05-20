import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: { bodyParser: true },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('Subscribe endpoint hit:', req.method);

  const origin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : (req.headers.origin ?? '*');

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.error('[subscribe] Rejected method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = (req.body ?? {}) as { email?: unknown };

  console.log('[subscribe] Received request, email present:', !!email);

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    console.error('[subscribe] Invalid email:', email);
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID;

  console.log('[subscribe] Env check — apiKey present:', !!apiKey, '| pubId present:', !!pubId);

  if (!apiKey || !pubId) {
    console.error('[subscribe] Missing env vars');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const url = `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`;

  try {
    console.log('[subscribe] Posting to Beehiiv for:', email.trim());

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        reactivate_existing: false,
        send_welcome_email: true,
      }),
    });

    const responseText = await upstream.text();
    console.log('[subscribe] Beehiiv status:', upstream.status, '| body:', responseText);

    if (!upstream.ok) {
      res.status(502).json({ error: 'Subscription service error' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[subscribe] Fetch threw:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
