import type { VercelRequest, VercelResponse } from '@vercel/node';

const getApiKey = () => process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = getApiKey();
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables.' });

  const { url, ...claudeBody } = req.body || {};

  try {
    let body = claudeBody;

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
        'x-api-key': key,
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
