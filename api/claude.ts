import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiKey = () => process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

// Strip HTML tags and collapse whitespace — keeps text readable for Claude
// without blowing the token limit on a full HTML document
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
    .slice(0, 12000); // cap at ~3k tokens to stay well within limits
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = apiKey();
  if (!key) {
    return res.status(500).json({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel.' });
  }

  const { url, ...claudeBody } = req.body || {};

  try {
    let body = claudeBody;

    // If a URL was passed, fetch the page here (server-side, no CORS) and
    // inject the extracted text into the Claude prompt
    if (url) {
      let pageText = '';
      try {
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MiseEnPlaceBot/1.0)',
            'Accept': 'text/html',
          },
          signal: AbortSignal.timeout(10000),
        });
        const html = await pageRes.text();
        pageText = extractText(html);
      } catch (fetchErr: any) {
        console.warn('Page fetch failed, falling back to URL-only prompt:', fetchErr.message);
        // Fall through — Claude will try with just the URL in the prompt
      }

      // Replace the placeholder in the user message with actual page content
      if (body.messages?.[0]?.content && pageText) {
        const original = body.messages[0].content;
        const injected = typeof original === 'string'
          ? original + `\n\nHere is the page content:\n${pageText}`
          : Array.isArray(original)
            ? original.map((block: any) =>
                block.type === 'text'
                  ? { ...block, text: block.text + `\n\nHere is the page content:\n${pageText}` }
                  : block
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
        anthropic_error: data,
      });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Proxy request failed' });
  }
}
