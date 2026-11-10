import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatSize, loaderName, minecraftBandLabel } from '../src/lib/format.ts';

describe('formatSize', () => {
  it.each([
    [58331946, '55,6 Mo'],
    [184160999, '175,6 Mo'],
    [8105984, '7,7 Mo'],
    [65830, '64 Ko'],
    [440, '440 octets'],
    [2 * 1024 ** 3, '2 Go'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('writes the date in French, in the Paris time zone', () => {
    expect(formatDate('2026-10-28T15:32:10Z')).toBe('28 octobre 2026');
    expect(formatDate('2026-06-30T23:41:02Z')).toBe('1er juillet 2026');
  });
});

describe('formatDateTime', () => {
  it('writes the day, month and Paris time', () => {
    expect(formatDateTime(Date.parse('2026-11-10T13:05:00Z'))).toBe('10 novembre à 14 h 05');
    expect(formatDateTime(Date.parse('2026-07-01T08:30:00Z'))).toBe('1er juillet à 10 h 30');
  });
});

describe('loaderName', () => {
  it('spells the loaders like their projects do', () => {
    expect(loaderName('neoforge')).toBe('NeoForge');
    expect(loaderName('fabric')).toBe('Fabric');
    expect(loaderName('forge')).toBe('Forge');
  });
});

describe('minecraftBandLabel', () => {
  it('turns a band id into a readable range', () => {
    expect(minecraftBandLabel('1.21.5-1.21.8')).toBe('1.21.5 à 1.21.8');
    expect(minecraftBandLabel('1.21.11')).toBe('1.21.11');
  });
});
