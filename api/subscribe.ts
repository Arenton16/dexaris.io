import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !pubId) {
    console.error('Missing env vars — BEEHIIV_API_KEY:', !!apiKey, 'BEEHIIV_PUBLICATION_ID:', !!pubId);
    return res.status(500).json({ error: 'Server configuration error — missing environment variables' });
  }

  try {
    const beehiivRes = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
        }),
      }
    );

    const beehiivData = await beehiivRes.json();
    console.log('Beehiiv response status:', beehiivRes.status);
    console.log('Beehiiv response body:', JSON.stringify(beehiivData));

    if (!beehiivRes.ok) {
      return res.status(500).json({
        error: 'Beehiiv API error',
        status: beehiivRes.status,
        detail: beehiivData,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Network error calling Beehiiv', detail: String(err) });
  }
}
