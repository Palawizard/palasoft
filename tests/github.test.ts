import { describe, expect, it, vi } from 'vitest';
import {
  fetchReleases,
  fetchRepoJsonFile,
  GitHubRequestError,
  isBeta,
  latestRelease,
  nextPageUrl,
  releasesSchema,
  versionLabel,
} from '../src/lib/github.ts';
import { jsonResponse, readFixture, releasesFixture } from './helpers/fixtures.ts';

const options = (fetchImpl: typeof fetch, token?: string) => ({
  apiUrl: 'https://api.example.test',
  token,
  timeoutMs: 1000,
  fetch: fetchImpl,
});

describe('fetchReleases', () => {
  it('parses a recorded release list', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(releasesFixture('Palawizard/PalaClips')));
    const releases = await fetchReleases('Palawizard/PalaClips', options(fetchImpl));
    expect(releases).toHaveLength(8);
    expect(releases[0]?.assets.map((asset) => asset.name)).toEqual([
      'latest.json',
      'PalaClips_1.4.1_x64-setup.exe',
      'PalaClips_1.4.1_x64-setup.exe.sig',
    ]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/repos/Palawizard/PalaClips/releases?per_page=100',
    );
  });

  it('sends the token only when one is set', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse([]));
    await fetchReleases('Palawizard/timestamper', options(fetchImpl));
    await fetchReleases('Palawizard/timestamper', options(fetchImpl, 'secret'));
    const sentHeaders = fetchImpl.mock.calls.map((call) => call[1]?.headers as Record<string, string>);
    expect(sentHeaders[0]).not.toHaveProperty('Authorization');
    expect(sentHeaders[1]?.['Authorization']).toBe('Bearer secret');
  });

  it('throws on an error status', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ message: 'Server Error' }, 502));
    await expect(fetchReleases('Palawizard/timestamper', options(fetchImpl))).rejects.toBeInstanceOf(
      GitHubRequestError,
    );
  });

  it('rejects a response that does not match the schema', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ message: 'Not Found' }));
    await expect(fetchReleases('Palawizard/timestamper', options(fetchImpl))).rejects.toThrow();
  });

  it('aborts a request that takes longer than the timeout', async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    await expect(
      fetchReleases('Palawizard/timestamper', { ...options(fetchImpl), timeoutMs: 20 }),
    ).rejects.toThrow();
  });
});

describe('fetchRepoJsonFile', () => {
  it('asks for the raw file at the given ref', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse(readFixture('github/palasitemclear-version-matrix-v0.1.2.json')),
    );
    const file = await fetchRepoJsonFile(
      'Palawizard/PalasItemClear',
      'v0.1.2',
      'versions/version-matrix.json',
      options(fetchImpl),
    );
    expect(file).toHaveProperty('bands');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/repos/Palawizard/PalasItemClear/contents/versions/version-matrix.json?ref=v0.1.2',
    );
    const sentHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(sentHeaders['Accept']).toBe('application/vnd.github.raw+json');
  });
});

describe('latestRelease', () => {
  it('returns the most recently published release', () => {
    const releases = releasesSchema.parse(releasesFixture('Palawizard/slbs-soundboard'));
    expect(latestRelease(releases.toReversed())?.tag_name).toBe('v0.5.0');
  });

  it('skips drafts', () => {
    const releases = releasesSchema.parse(releasesFixture('Palawizard/layout-manager-2'));
    const [newest, older] = releases;
    if (newest === undefined || older === undefined) throw new Error('fixture changed');
    expect(latestRelease([{ ...newest, draft: true }, older])?.tag_name).toBe('v0.1.0-beta.1');
  });

  it('returns nothing when no release is published', () => {
    expect(latestRelease([])).toBeUndefined();
  });
});

describe('isBeta', () => {
  it('detects a beta from the tag even when GitHub does not flag it', () => {
    const [release] = releasesSchema.parse(releasesFixture('Palawizard/timestamper'));
    if (release === undefined) throw new Error('fixture changed');
    expect(release.prerelease).toBe(false);
    expect(isBeta(release)).toBe(true);
    expect(versionLabel(release)).toBe('0.1.0-beta.1');
  });

  it('treats a stable tag as stable', () => {
    const [release] = releasesSchema.parse(releasesFixture('Palawizard/PalaClips'));
    if (release === undefined) throw new Error('fixture changed');
    expect(isBeta(release)).toBe(false);
    expect(versionLabel(release)).toBe('1.4.1');
  });

  it('trusts the prerelease flag', () => {
    const [release] = releasesSchema.parse(releasesFixture('Palawizard/PalaClips'));
    if (release === undefined) throw new Error('fixture changed');
    expect(isBeta({ ...release, prerelease: true })).toBe(true);
  });
});

describe('fetchReleases pagination', () => {
  const pages = [1, 2].map(
    (page) => readFixture(`github/palaclips-releases-per-page-5-page-${page}.json`) as { link: string; body: unknown },
  );

  it('follows the next links GitHub sends', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const page = String(input).includes('page=2') ? pages[1] : pages[0];
      return new Response(JSON.stringify(page?.body), { headers: { link: page?.link ?? '' } });
    });
    const releases = await fetchReleases('Palawizard/PalaClips', {
      apiUrl: 'https://api.github.com',
      token: undefined,
      timeoutMs: 1000,
      fetch: fetchImpl,
    });
    expect(releases.map((release) => release.tag_name)).toEqual([
      'v1.4.1',
      'v1.4.0',
      'v1.3.1',
      'v1.3.0',
      'v1.2.0',
      'v1.1.1',
      'v1.1.0',
      'v1.0.0',
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe(
      'https://api.github.com/repositories/1420928030/releases?per_page=5&page=2',
    );
  });

  it('never follows a next link to another host', () => {
    expect(nextPageUrl(pages[0]?.link ?? null, 'https://api.github.com')).toBe(
      'https://api.github.com/repositories/1420928030/releases?per_page=5&page=2',
    );
    expect(nextPageUrl('<https://evil.example/releases?page=2>; rel="next"', 'https://api.github.com')).toBeUndefined();
    expect(nextPageUrl(pages[1]?.link ?? null, 'https://api.github.com')).toBeUndefined();
    expect(nextPageUrl(null, 'https://api.github.com')).toBeUndefined();
  });
});
