import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchCurseForgeDownloads, fetchModrinthDownloads, modrinthSlug, StoreRequestError } from '../src/lib/stores.ts';
import { jsonResponse, readFixture } from './helpers/fixtures.ts';

const options = (fetchImpl: typeof fetch) => ({ apiUrl: 'https://api.modrinth.test/v2', timeoutMs: 1000, fetch: fetchImpl });

describe('modrinthSlug', () => {
  it('reads the slug from the project page link', () => {
    expect(modrinthSlug('https://modrinth.com/mod/palas-item-clear')).toBe('palas-item-clear');
    expect(modrinthSlug('https://modrinth.com/mod/palas-item-clear/')).toBe('palas-item-clear');
    expect(modrinthSlug('https://modrinth.com/user/Palawi')).toBeUndefined();
  });
});

describe('fetchModrinthDownloads', () => {
  it('reads the download count of a recorded project', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(readFixture('modrinth/project-palas-item-clear.json')));
    expect(await fetchModrinthDownloads('palas-item-clear', options(fetchImpl))).toBe(4132);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.modrinth.test/v2/project/palas-item-clear');
    const sentHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(sentHeaders['User-Agent']).toMatch(/^palasoft/);
  });

  it('throws when Modrinth answers with an error', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ error: 'not_found' }, 404));
    await expect(fetchModrinthDownloads('palas-item-clear', options(fetchImpl))).rejects.toBeInstanceOf(StoreRequestError);
  });
});

describe('fetchCurseForgeDownloads', () => {
  const refusal = readFileSync(new URL('./fixtures/curseforge/mods-search-without-key-403.txt', import.meta.url), 'utf8');

  it('sends the key in the x-api-key header to the mod endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(refusal, { status: 403 }));
    await expect(
      fetchCurseForgeDownloads(123456, 'test-key', { apiUrl: 'https://api.curseforge.test', timeoutMs: 1000, fetch: fetchImpl }),
    ).rejects.toBeInstanceOf(StoreRequestError);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.curseforge.test/v1/mods/123456');
    const sentHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(sentHeaders['x-api-key']).toBe('test-key');
  });
});
