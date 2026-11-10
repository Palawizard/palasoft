import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fr } from '../src/i18n/fr.ts';
import { en } from '../src/i18n/en.ts';

const FR_DIR = new URL('../src/content/software/', import.meta.url);
const EN_DIR = new URL('../src/content/software-en/', import.meta.url);

// Counts the items of a top-level list in a frontmatter block, enough for these simple files.
const listLength = (markdown: string, key: string): number => {
  const frontmatter = markdown.split(/^---$/m)[1] ?? '';
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return 0;
  let count = 0;
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith(' ')) break;
    if (line.startsWith('  - ')) count += 1;
  }
  return count;
};

const headings = (markdown: string): number => markdown.split('\n').filter((line) => line.startsWith('## ')).length;

// Same shape of keys and arrays, so no string is missing in one language.
const shape = (value: unknown): unknown => {
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  }
  return typeof value;
};

describe('English translation', () => {
  it('has the same strings as the French dictionary', () => {
    expect(shape(en)).toEqual(shape(fr));
  });

  const slugs = readdirSync(FR_DIR).filter((file) => file.endsWith('.md'));

  it.each(slugs)('translates %s fully', (file) => {
    const french = readFileSync(new URL(file, FR_DIR), 'utf8');
    const english = readFileSync(new URL(file, EN_DIR), 'utf8');
    expect(listLength(english, 'screenshotAlts')).toBe(listLength(french, 'screenshots'));
    expect(listLength(english, 'requirements')).toBe(listLength(french, 'requirements'));
    expect(headings(english)).toBe(headings(french));
    expect(english).not.toMatch(/—/);
  });
});
