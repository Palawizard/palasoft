import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalog, type SoftwareSource } from '../src/lib/catalog.ts';
import { readConfig } from '../src/lib/config.ts';
import { jsonResponse, readFixture, releasesFixture } from './helpers/fixtures.ts';

const palaclips: SoftwareSource = {
  slug: 'palaclips',
  repo: 'Palawizard/PalaClips',
  kind: 'windows',
  installerPattern: '^PalaClips_.+_x64-setup\\.exe$',
};

const itemClear: SoftwareSource = {
  slug: 'palas-item-clear',
  repo: 'Palawizard/PalasItemClear',
  kind: 'minecraft-mod',
  versionMatrix: 'versions/version-matrix.json',
  modrinthSlug: 'palas-item-clear',
  curseforgeId: 123456,
};

const curseForgeRefusal = readFileSync(
  new URL('./fixtures/curseforge/mods-search-without-key-403.txt', import.meta.url),
  'utf8',
);

const recordedGitHub = vi.fn<typeof fetch>(async (input) => {
  const url = new URL(String(input));
  if (url.host === 'api.modrinth.test' && url.pathname === '/v2/project/palas-item-clear') {
    return jsonResponse(readFixture('modrinth/project-palas-item-clear.json'));
  }
  if (url.host === 'api.curseforge.test') return new Response(curseForgeRefusal, { status: 403 });
  const releases = /^\/repos\/(Palawizard\/[^/]+)\/releases$/.exec(url.pathname);
  if (releases?.[1] !== undefined) return jsonResponse(releasesFixture(releases[1]));
  if (url.pathname === '/repos/Palawizard/PalasItemClear/contents/versions/version-matrix.json' && url.searchParams.get('ref') === 'v0.1.2') {
    return jsonResponse(readFixture('github/palasitemclear-version-matrix-v0.1.2.json'));
  }
  return jsonResponse({ message: 'Not Found' }, 404);
});

describe('createCatalog', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-catalog-'));
    recordedGitHub.mockClear();
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  const catalog = (fetchImpl: typeof fetch, env: Record<string, string> = {}) =>
    createCatalog(
      readConfig({
        DATA_DIR: dataDir,
        GITHUB_API_URL: 'https://api.example.test',
        MODRINTH_API_URL: 'https://api.modrinth.test/v2',
        CURSEFORGE_API_URL: 'https://api.curseforge.test',
        ...env,
      }),
      { fetch: fetchImpl, onError: () => {} },
    );

  const hosts = (): string[] => recordedGitHub.mock.calls.map((call) => new URL(String(call[0])).host);

  it('describes the latest Windows release and its installer', async () => {
    const view = await catalog(recordedGitHub).release(palaclips);
    expect(view).toMatchObject({
      state: 'ready',
      stale: false,
      historyUrl: 'https://github.com/Palawizard/PalaClips/releases',
      release: { version: '1.4.1', isBeta: false, publishedAt: '2026-10-28T15:32:10Z' },
      installer: { name: 'PalaClips_1.4.1_x64-setup.exe', size: 58331946 },
      modFiles: [],
    });
  });

  it('reads the mod matrix at the published tag', async () => {
    const view = await catalog(recordedGitHub).release(itemClear);
    if (view.state !== 'ready') throw new Error(`unexpected state ${view.state}`);
    expect(view.installer).toBeUndefined();
    expect(view.modFiles).toHaveLength(25);
    expect(recordedGitHub.mock.calls.map((call) => String(call[0]))).toContain(
      'https://api.example.test/repos/Palawizard/PalasItemClear/contents/versions/version-matrix.json?ref=v0.1.2',
    );
  });

  it('reports a repository without any release', async () => {
    const view = await catalog(async () => jsonResponse([])).release(palaclips);
    expect(view).toEqual({ state: 'none', historyUrl: 'https://github.com/Palawizard/PalaClips/releases' });
  });

  it('serves the saved copy after a restart while GitHub is down', async () => {
    await catalog(recordedGitHub).release(palaclips);
    const view = await catalog(async () => jsonResponse({ message: 'Server Error' }, 500)).release(palaclips);
    expect(view).toMatchObject({ state: 'ready', stale: true, installer: { name: 'PalaClips_1.4.1_x64-setup.exe' } });
  });

  it('reports unavailable when GitHub is down and nothing was saved', async () => {
    const view = await catalog(async () => {
      throw new TypeError('fetch failed');
    }).release(itemClear);
    expect(view).toEqual({ state: 'unavailable', historyUrl: 'https://github.com/Palawizard/PalasItemClear/releases' });
  });

  it('counts the real GitHub downloads of a Windows program', async () => {
    expect(await catalog(recordedGitHub).downloads(palaclips)).toBe(33);
    expect(hosts()).not.toContain('api.modrinth.test');
  });

  it('adds Modrinth to GitHub for the mod and never calls CurseForge without a key', async () => {
    expect(await catalog(recordedGitHub).downloads(itemClear)).toBe(168 + 4132);
    expect(hosts()).not.toContain('api.curseforge.test');
  });

  it('leaves CurseForge out without a trace when it refuses the key', async () => {
    const onError = vi.fn();
    const withKey = createCatalog(
      readConfig({
        DATA_DIR: dataDir,
        GITHUB_API_URL: 'https://api.example.test',
        MODRINTH_API_URL: 'https://api.modrinth.test/v2',
        CURSEFORGE_API_URL: 'https://api.curseforge.test',
        CURSEFORGE_API_KEY: 'invalid-key',
      }),
      { fetch: recordedGitHub, onError },
    );
    expect(await withKey.downloads(itemClear)).toBe(168 + 4132);
    expect(hosts()).toContain('api.curseforge.test');
    expect(onError).toHaveBeenCalled();
  });

  it('keeps counting GitHub when Modrinth is down', async () => {
    const modrinthDown = vi.fn<typeof fetch>(async (input) =>
      new URL(String(input)).host === 'api.modrinth.test' ? jsonResponse({}, 503) : recordedGitHub(input),
    );
    expect(await catalog(modrinthDown).downloads(itemClear)).toBe(168);
  });

  it('has no count when GitHub is down and nothing was saved', async () => {
    expect(await catalog(async () => jsonResponse({}, 503)).downloads(palaclips)).toBeUndefined();
  });
});
