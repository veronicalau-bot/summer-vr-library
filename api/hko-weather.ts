import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { dataType = 'rhrread', lang = 'tc' } = req.query as { dataType?: string; lang?: string };

  const target = `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=${dataType}&lang=${lang}`;

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'summer-vr-library/1.0' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `HKO upstream error: ${upstream.statusText}` });
    }

    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(200).send(body);
  } catch (err: any) {
    console.error('HKO proxy error:', err);
    return res.status(500).json({ error: err.message ?? 'Proxy failure' });
  }
}
