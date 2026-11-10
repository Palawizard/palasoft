import type { APIRoute } from 'astro';
import { allSoftware, localizedPath } from '../server/software.ts';
import { LOCALES } from '../lib/locale.ts';

// Listed in the robots.txt of palawi.fr, so search engines find every program page in both languages.
// Each URL lists its two language versions, as Google asks for pages with hreflang.
export const GET: APIRoute = async ({ site }) => {
  const software = await allSoftware();
  const pagePaths = ['/', ...software.map((entry) => `/${entry.id}`)];
  const absolute = (path: string): string => new URL(path, site).href;
  const urls = pagePaths.flatMap((pagePath) => {
    const links = LOCALES.map(
      (locale) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${absolute(localizedPath(pagePath, locale))}"/>`,
    ).join('\n');
    return LOCALES.map((locale) => `  <url>\n    <loc>${absolute(localizedPath(pagePath, locale))}</loc>\n${links}\n  </url>`);
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
