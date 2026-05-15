import crypto from 'crypto';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getServiceAccountToken() {
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
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = base64url(sign.sign(key.private_key));
  const jwt = `${signingInput}.${signature}`;

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

function extractText(html) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure body is parsed — Vercel should do this automatically but guard anyway
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  const { action, url, sheetWrite: sheetWriteData, ...claudeBody } = body;

  // ── Google Sheets write via service account ──────────────────────────────────
  if (action === 'sheetWrite') {
    try {
      const token = await getServiceAccountToken();
      const { method = 'POST', url: sheetUrl, body: sheetBody } = sheetWriteData;

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
    } catch (err) {
      console.error('Sheet write error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Anthropic API call ───────────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
  }

  try {
    let finalBody = claudeBody;

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
      } catch (fetchErr) {
        console.warn('Page fetch failed:', fetchErr.message);
      }

      if (pageText && finalBody.messages && finalBody.messages[0]) {
        const original = finalBody.messages[0].content;
        const append = `\n\nPage content:\n${pageText}`;
        const injected = typeof original === 'string'
          ? original + append
          : Array.isArray(original)
            ? original.map(block => block.type === 'text' ? { ...block, text: block.text + append } : block)
            : original;
        finalBody = { ...finalBody, messages: [{ ...finalBody.messages[0], content: injected }, ...finalBody.messages.slice(1)] };
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(finalBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `Anthropic returned ${response.status}`,
      });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Proxy failed', stack: err.stack?.slice(0, 300) });
  }
};
