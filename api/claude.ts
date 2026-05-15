import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Try both — VITE_ prefix is for browser bundles, Node.js prefers without it
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel environment variables.' 
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      // Pass the real Anthropic error back so we can see it
      return res.status(response.status).json({
        error: data.error?.message || `Anthropic returned ${response.status}`,
        anthropic_error: data,
      });
    }
    console.log('Key being used:', apiKey?.slice(0, 20));
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
}
