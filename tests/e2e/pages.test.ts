import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { get, startFakeGitHub, startSite, type FakeGitHub, type Site } from './harness.ts';

const PAGES = [
  '/software/',
  '/software/palaclips',
  '/software/slbs-soundboard',
  '/software/layout-manager',
  '/software/silence-splitter',
  '/software/timestamper',
  '/software/palas-item-clear',
];

const html = async (site: Site, path: string): Promise<{ status: number; body: string }> => {
  const response = await get(site, path);
  return { status: response.status, body: await response.text() };
};

describe('pages on the built server', () => {
  let github: FakeGitHub;
  let dataDir: string;
  const sites: Site[] = [];

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-pages-'));
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

  it('renders every page while GitHub is down and nothing was saved', async () => {
    github.down = true;
    const site = await start();
    for (const path of PAGES) {
      const { status, body } = await html(site, path);
      expect(status, path).toBe(200);
      expect(body, path).toContain('ne répond pas en ce moment');
      expect(body, path).not.toContain('téléchargements');
    }
    const home = await html(site, '/software/');
    expect(home.body).toContain("version indisponible pour l’instant");
    const mod = await html(site, '/software/palas-item-clear');
    expect(mod.body).toContain('https://github.com/Palawizard/PalasItemClear/releases/latest');
    await site.stop();
  });

  it('renders the release details when GitHub answers', async () => {
    github.down = false;
    const site = await start();
    const home = await html(site, '/software/');
    expect(home.status).toBe(200);
    expect(home.body).not.toContain('ne répond pas');
    expect(home.body).toContain('version 1.4.1');
    expect(home.body).toContain('55,6 Mo');
    const page = await html(site, '/software/palaclips');
    expect(page.body).toContain('publiée le 28 octobre 2026');
    expect(page.body).toContain('href="/software/dl/palaclips"');
    expect(page.body).toContain("Si Windows t’avertit");
    expect(home.body).toContain('33 téléchargements');
    expect(page.body).toContain('33 téléchargements');
    const mod = await html(site, '/software/palas-item-clear');
    expect(mod.body).toContain('4\u202f300 téléchargements');
    expect(github.requests).toContain('/modrinth/v2/project/palas-item-clear');
    expect(github.requests.some((path) => path.startsWith('/curseforge'))).toBe(false);
    expect(mod.body).toContain('name="mc-forge"');
    expect(mod.body).toContain('value="1.21.6-1.21.8"');
    expect(mod.body).not.toContain("Si Windows t’avertit");
    await site.stop();
  });

  it('explains when a program has no published version yet', async () => {
    github.down = false;
    github.withoutReleases.add('Palawizard/timestamper');
    const emptyDataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-empty-'));
    const site = await startSite({ GITHUB_API_URL: github.url, DATA_DIR: emptyDataDir });
    sites.push(site);
    const page = await html(site, '/software/timestamper');
    expect(page.status).toBe(200);
    expect(page.body).toContain("Aucune version n’est publiée pour l’instant.");
    expect(page.body).not.toContain('href="/software/dl/timestamper"');
    const home = await html(site, '/software/');
    expect(home.body).toContain('pas encore de version publiée');
    expect(home.body).not.toContain('href="/software/dl/timestamper"');
    const download = await get(site, '/software/dl/timestamper');
    expect(download.headers.get('location')).toBe('/software/timestamper');
    await site.stop();
    github.withoutReleases.clear();
    await rm(emptyDataDir, { recursive: true, force: true });
  });

  it('shows the saved release details with their date after a restart while GitHub is down', async () => {
    github.down = true;
    const site = await start();
    for (const path of PAGES) {
      const { status, body } = await html(site, path);
      expect(status, path).toBe(200);
      expect(body, path).toContain('Les infos de version affichées datent du');
    }
    const home = await html(site, '/software/');
    expect(home.body).toContain('version 1.4.1');
  });
});
