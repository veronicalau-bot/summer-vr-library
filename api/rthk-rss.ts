import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path = 'c_expressnews_clocal.xml' } = req.query as { path?: string };

  const target = `https://rthk9.rthk.hk/rthk/news/rss/${path}`;

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'summer-vr-library/1.0' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `RTHK upstream error: ${upstream.statusText}` });
    }

    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(200).send(body);
  } catch (err: any) {
    console.error('RTHK proxy error:', err);
    return res.status(500).json({ error: err.message ?? 'Proxy failure' });
  }
}
