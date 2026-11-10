import { describe, expect, it } from 'vitest';
import { localeFromCookie, pickLocale } from '../src/lib/locale.ts';

describe('pickLocale', () => {
  it.each([
    ['fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7', 'fr'],
    ['fr', 'fr'],
    ['fr-CA', 'fr'],
    ['en-US,en;q=0.9', 'en'],
    ['en-GB,en;q=0.9,fr;q=0.8', 'en'],
    ['de-DE,de;q=0.9', 'en'],
    ['de-DE,de;q=0.9,fr;q=0.5', 'fr'],
    ['es;q=0.9,en;q=0.5,fr;q=0.7', 'fr'],
    ['*', undefined],
    ['*;q=0.5, de', 'en'],
  ] as const)('reads %s as %s', (header, locale) => {
    expect(pickLocale(header)).toBe(locale);
  });

  it.each([null, undefined, '', '   ', 'fr;q=0'])('has no answer for %s', (header) => {
    expect(pickLocale(header)).toBeUndefined();
  });
});

describe('localeFromCookie', () => {
  it('keeps only a known language', () => {
    expect(localeFromCookie('en')).toBe('en');
    expect(localeFromCookie('fr')).toBe('fr');
    expect(localeFromCookie('de')).toBeUndefined();
    expect(localeFromCookie(undefined)).toBeUndefined();
  });
});
