import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { get, startFakeGitHub, startSite, type FakeGitHub, type Site } from './harness.ts';

const DOWNLOAD = 'https://github.com/Palawizard';

describe('download routes on the built server', () => {
  let github: FakeGitHub;
  let site: Site;
  let dataDir: string;

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-'));
    site = await startSite({ GITHUB_API_URL: github.url, DATA_DIR: dataDir });
  });

  afterAll(async () => {
    await site?.stop();
    await github?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('answers the health check', async () => {
    const response = await get(site, '/software/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it.each([
    ['palaclips', `${DOWNLOAD}/PalaClips/releases/download/v1.4.1/PalaClips_1.4.1_x64-setup.exe`],
    ['slbs-soundboard', `${DOWNLOAD}/slbs-soundboard/releases/download/v0.5.0/slbs-soundboard_0.5.0_x64.msi`],
    ['layout-manager', `${DOWNLOAD}/layout-manager-2/releases/download/v0.1.0-beta.2/Layout.Manager.2_0.1.0-beta.2_x64-setup.exe`],
    ['silence-splitter', `${DOWNLOAD}/silence-splitter/releases/download/v1.0.0-beta.2/Silence-Splitter-1.0.0-beta.2-x64-setup.exe`],
    ['timestamper', `${DOWNLOAD}/timestamper/releases/download/v0.1.0-beta.1/Timestamper_0.1.0-beta.1_x64-setup.exe`],
  ])('redirects /software/dl/%s to the installer', async (slug, location) => {
    const response = await get(site, `/software/dl/${slug}`);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(location);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('redirects a named file of the latest release', async () => {
    const response = await get(site, '/software/dl/palas-item-clear/palas-item-clear-1.21.8-fabric-0.1.2.jar');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `${DOWNLOAD}/PalasItemClear/releases/download/v0.1.2/palas-item-clear-1.21.8-fabric-0.1.2.jar`,
    );
  });

  it.each([
    '/software/dl/palaclips/PalaClips_1.4.0_x64-setup.exe',
    '/software/dl/palaclips/unknown.exe',
    '/software/dl/palaclips/..%2F..%2Fapi%2Fhealth',
    '/software/dl/unknown-software',
    '/software/dl/unknown-software/PalaClips_1.4.1_x64-setup.exe',
  ])('answers 404 for %s', async (path) => {
    const response = await get(site, path);
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).toContain('page introuvable');
  });

  it('sends the mod button to its page, where the version is chosen', async () => {
    const response = await get(site, '/software/dl/palas-item-clear');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/software/palas-item-clear#telecharger');
  });

  it.each([
    ['forge', '1.21.5', 'palas-item-clear-1.21.5-forge-0.1.2.jar'],
    ['forge', '1.21.6-1.21.8', 'palas-item-clear-1.21.8-forge-0.1.2.jar'],
    ['fabric', '1.21.5-1.21.8', 'palas-item-clear-1.21.8-fabric-0.1.2.jar'],
    ['neoforge', '1.20.1', 'palas-item-clear-1.20.1-neoforge-0.1.2.jar'],
  ])('redirects the mod form for %s and Minecraft %s to its jar', async (loader, band, jar) => {
    const query = new URLSearchParams({ loader, [`mc-${loader}`]: band, 'mc-other': 'ignored' });
    const response = await get(site, `/software/dl/palas-item-clear?${query}`);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${DOWNLOAD}/PalasItemClear/releases/download/v0.1.2/${jar}`);
  });

  it('sends an impossible mod choice back to the picker', async () => {
    const query = new URLSearchParams({ loader: 'fabric', 'mc-fabric': '1.21.5' });
    const response = await get(site, `/software/dl/palas-item-clear?${query}`);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/software/palas-item-clear#telecharger');
  });
});

describe('download routes while GitHub is down', () => {
  let github: FakeGitHub;
  let dataDir: string;
  const sites: Site[] = [];

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-down-'));
  });

  afterAll(async () => {
    await Promise.all(sites.map((site) => site.stop()));
    await github?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const start = async (): Promise<Site> => {
    const site = await startSite({ GITHUB_API_URL: github.url, DATA_DIR: dataDir });
    sites.push(site);
    return site;
  };

  it('sends visitors to the GitHub releases page when nothing was saved yet', async () => {
    github.down = true;
    const site = await start();
    const response = await get(site, '/software/dl/palaclips');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://github.com/Palawizard/PalaClips/releases/latest');
    expect((await get(site, '/software/api/health')).status).toBe(200);
    await site.stop();
  });

  it('keeps redirecting to the saved installer after a restart', async () => {
    github.down = false;
    const warm = await start();
    expect((await get(warm, '/software/dl/palaclips')).status).toBe(302);
    await warm.stop();

    github.down = true;
    const requestsBefore = github.requests.length;
    const restarted = await start();
    const response = await get(restarted, '/software/dl/palaclips');
    expect(github.requests.length).toBeGreaterThan(requestsBefore);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `${DOWNLOAD}/PalaClips/releases/download/v1.4.1/PalaClips_1.4.1_x64-setup.exe`,
    );
    const named = await get(restarted, '/software/dl/palaclips/PalaClips_1.4.1_x64-setup.exe.sig');
    expect(named.status).toBe(302);
  });
});
