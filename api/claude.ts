import * as crypto from 'crypto';

type VercelRequest = any;
type VercelResponse = any;

// ── Anthropic helpers ──────────────────────────────────────────────────────────
const getAnthropicKey = () =>
  process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000);
}

// ── Google Service Account JWT ─────────────────────────────────────────────────
// Generates a short-lived access token from the service account JSON key.
// No external libraries needed — pure Node.js crypto.

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getServiceAccountToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set in Vercel environment variables.');

  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;

  // Sign with RS256 using the private key
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = base64url(sign.sign(key.private_key));

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get service account token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, url, sheetWrite, ...claudeBody } = req.body || {};

  // ── Google Sheets write via service account ──────────────────────────────────
  // Called with { action: 'sheetWrite', sheetWrite: { method, url, body } }
  if (action === 'sheetWrite') {
    try {
      const token = await getServiceAccountToken();
      const { method = 'POST', url: sheetUrl, body: sheetBody } = sheetWrite;

      const sheetRes = await fetch(sheetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sheetBody),
      });

      const data = await sheetRes.json();
      if (!sheetRes.ok) {
        return res.status(sheetRes.status).json({ error: data.error?.message || 'Sheet write failed', detail: data });
      }
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Sheet write error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Anthropic API call ───────────────────────────────────────────────────────
  const anthropicKey = getAnthropicKey();
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });

  try {
    let body = claudeBody;

    // Server-side page fetch for web import
    if (url) {
      let pageText = '';
      try {
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MiseEnPlaceBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(10000),
        });
        const html = await pageRes.text();
        pageText = extractText(html);
      } catch (fetchErr: any) {
        console.warn('Page fetch failed:', fetchErr.message);
      }

      if (pageText && body.messages?.[0]?.content) {
        const original = body.messages[0].content;
        const append = `\n\nPage content:\n${pageText}`;
        const injected = typeof original === 'string'
          ? original + append
          : Array.isArray(original)
            ? original.map((block: any) =>
                block.type === 'text' ? { ...block, text: block.text + append } : block
              )
            : original;
        body = { ...body, messages: [{ ...body.messages[0], content: injected }, ...body.messages.slice(1)] };
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `Anthropic returned ${response.status}`,
      });
    }
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Proxy failed' });
  }
}
