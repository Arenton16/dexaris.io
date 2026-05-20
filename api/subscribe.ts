interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface Res {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(data: unknown): void;
  end(): void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: Req, res: Res): Promise<void> {
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
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as Record<string, unknown> | null;
  const email = body?.email;

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !pubId) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const upstream = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
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
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('Beehiiv error:', upstream.status, text);
      res.status(502).json({ error: 'Subscription service error' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
