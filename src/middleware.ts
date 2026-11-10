import { defineMiddleware } from 'astro:middleware';
import { LOCALE_COOKIE, localeFromCookie, pickLocale, type Locale } from './lib/locale.ts';

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

// Routes that are not pages: downloads, the language switch, the health check, files.
const NOT_A_PAGE = /^\/(?:dl|lang|api|_image|_astro)(?:\/|$)|\.[a-z0-9]+$/i;

const splitPath = (pathname: string): { locale: Locale; pagePath: string } | undefined => {
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return undefined;
  const rest = pathname.slice(base.length) || '/';
  if (rest === '/en' || rest.startsWith('/en/')) return { locale: 'en', pagePath: rest.slice(3) || '/' };
  return { locale: 'fr', pagePath: rest };
};

const pathFor = (locale: Locale, pagePath: string): string =>
  locale === 'en' ? `${base}/en${pagePath === '/' ? '/' : pagePath}` : `${base}${pagePath}`;

/**
 * Sets the language of the page from its URL. A visitor who chose a language on the site (cookie) is sent to their
 * language; otherwise a French page sends a visitor whose system asks for English to the English page. Crawlers send
 * no Accept-Language and no cookie, so they always get the page they asked for.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const split = splitPath(context.url.pathname);
  context.locals.locale = split?.locale ?? 'fr';
  context.locals.pagePath = split?.pagePath ?? '/';
  if (split === undefined || NOT_A_PAGE.test(split.pagePath)) return next();

  const isRead = context.request.method === 'GET' || context.request.method === 'HEAD';
  const chosen = localeFromCookie(context.cookies.get(LOCALE_COOKIE)?.value);
  const wanted = chosen ?? (split.locale === 'fr' ? pickLocale(context.request.headers.get('accept-language')) : undefined);
  if (isRead && wanted !== undefined && wanted !== split.locale) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${pathFor(wanted, split.pagePath)}${context.url.search}`,
        'Cache-Control': 'private, no-store',
        Vary: 'Accept-Language, Cookie',
      },
    });
  }

  const response = await next();
  response.headers.append('Vary', 'Accept-Language, Cookie');
  return response;
});
