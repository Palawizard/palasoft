import type { AstroGlobal } from 'astro';
import { isLocale, type Locale } from '../lib/locale.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';

export type Strings = typeof fr;

const STRINGS: Readonly<Record<Locale, Strings>> = { fr, en };

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Language of the page being rendered: set by the middleware, read from the URL when a page is rerouted (404). */
export const localeOf = (astro: Pick<AstroGlobal, 'locals' | 'url'>): Locale => {
  const fromLocals: unknown = astro.locals.locale;
  if (isLocale(fromLocals)) return fromLocals;
  const path = astro.url.pathname;
  return path === `${base}/en` || path.startsWith(`${base}/en/`) ? 'en' : 'fr';
};

export const stringsFor = (locale: Locale): Strings => STRINGS[locale];

export const t = (astro: Pick<AstroGlobal, 'locals' | 'url'>): Strings => STRINGS[localeOf(astro)];
