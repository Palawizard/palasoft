// The two languages of the site. French is the default and lives at the root of the site; English under /en.
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export const isLocale = (value: unknown): value is Locale => value === 'fr' || value === 'en';

interface Range {
  tag: string;
  quality: number;
  index: number;
}

const parseRanges = (header: string): Range[] =>
  header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
      const quality = q === undefined ? 1 : Number.parseFloat(q.slice(2));
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((range) => range.tag !== '' && range.tag !== '*' && range.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

/**
 * The language a visitor's system asks for, from the Accept-Language header: French when French comes before English,
 * English otherwise (English is the shared language of everyone else). Undefined without a usable header, which is
 * how search engine crawlers ask, and for a bare `*` (any language, sent by many scripts): they get the default page.
 */
export const pickLocale = (acceptLanguage: string | null | undefined): Locale | undefined => {
  if (acceptLanguage === null || acceptLanguage === undefined || acceptLanguage.trim() === '') return undefined;
  const ranges = parseRanges(acceptLanguage);
  if (ranges.length === 0) return undefined;
  for (const { tag } of ranges) {
    const primary = tag.split('-')[0];
    if (primary === 'fr') return 'fr';
    if (primary === 'en') return 'en';
  }
  return 'en';
};

export const LOCALE_COOKIE = 'palasoft-lang';

export const localeFromCookie = (value: string | undefined): Locale | undefined => (isLocale(value) ? value : undefined);
