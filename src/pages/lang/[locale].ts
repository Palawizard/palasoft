import type { APIRoute } from 'astro';
import { LOCALE_COOKIE, isLocale } from '../../lib/locale.ts';

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

// The language switch: remembers the choice for a year, then goes back to the page in that language.
// Only paths of this site are followed, so the link cannot send anyone elsewhere.
export const GET: APIRoute = ({ params, url, cookies }) => {
  const { locale } = params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const next = url.searchParams.get('next') ?? '';
  const target = next.startsWith(`${base}/`) && !next.startsWith('//') && !next.includes('\\') ? next : `${base}/`;
  cookies.set(LOCALE_COOKIE, locale, { path: `${base}/`, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'private, no-store' } });
};
