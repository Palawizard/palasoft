import type { APIRoute } from 'astro';
import { allSoftware, homePath, softwarePath } from '../server/software.ts';

// Listed in the robots.txt of palawi.fr, so search engines find every program page.
export const GET: APIRoute = async ({ site }) => {
  const software = await allSoftware();
  const paths = [homePath, ...software.map((entry) => softwarePath(entry.id))];
  const urls = paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
