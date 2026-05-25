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
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  console.log(`[subscribe] apiKey prefix=${apiKey.slice(0, 4)} pubId prefix=${pubId.slice(0, 4)} email=${email}`);

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
          email: email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'dexaris.io',
          utm_medium: 'organic',
          utm_campaign: 'website',
        }),
      }
    );

    const rawText = await beehiivRes.text();

    if (!beehiivRes.ok) {
      console.error('Beehiiv error status:', beehiivRes.status, beehiivRes.statusText);
      console.error('Beehiiv error body:', rawText);
      return res.status(500).json({ error: 'Beehiiv API error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Beehiiv fetch threw:', err);
    return res.status(500).json({ error: String(err) });
  }
}
