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
  '/software/chest-counter',
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
      // Without release details the buttons lead to GitHub pages: no thank-you window.
      expect(body, path).not.toMatch(/<a [^>]*data-thanks=/);
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
    expect(page.body).toContain('id="smartscreen-title"');
    expect(home.body).toContain('33 téléchargements');
    expect(page.body).toContain('33 téléchargements');
    const mod = await html(site, '/software/palas-item-clear');
    expect(mod.body).toContain('4\u202f300 téléchargements');
    expect(github.requests).toContain('/modrinth/v2/project/palas-item-clear');
    expect(github.requests.some((path) => path.startsWith('/curseforge'))).toBe(false);
    expect(mod.body).toContain('name="mc-forge"');
    expect(mod.body).toContain('value="1.21.6-1.21.8"');
    expect(mod.body).not.toContain('id="smartscreen-title"');
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

  it('puts the theme switch on the sun of every page and sets the theme before paint', async () => {
    github.down = false;
    const site = await start();
    for (const path of PAGES) {
      const { body } = await html(site, path);
      expect(body, path).toMatch(/<button[^>]*data-sky-toggle[^>]*aria-label="Passer au thème sombre"/);
      const head = body.slice(0, body.indexOf('</head>'));
      expect(head, path).toContain("localStorage.getItem('palasoft-theme')");
      expect(head, path).toContain('document.documentElement.dataset.theme');
    }
  });

  it('gives every page a share picture and structured data, and lists them in the sitemap', async () => {
    github.down = false;
    const site = await start();
    for (const path of PAGES) {
      const { body } = await html(site, path);
      const head = body.slice(0, body.indexOf('</head>'));
      expect(head, path).toMatch(/<meta property="og:image" content="https:\/\/palawi\.fr\/software\/[^"]+"/);
      expect(head, path).toContain('<meta name="twitter:card" content="summary_large_image"');
      expect(head, path).toContain('<link rel="canonical" href="https://palawi.fr' + path + '"');
      const ld = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(head);
      expect(ld, path).not.toBeNull();
      const graph = (JSON.parse(ld?.[1] ?? '{}') as { '@graph': { '@type': string }[] })['@graph'];
      expect(graph.map((node) => node['@type']), path).toEqual(
        path === '/software/' ? ['WebSite', 'ItemList'] : ['SoftwareApplication', 'BreadcrumbList'],
      );
    }
    const card = await get(site, '/software/og-palasoft.jpg');
    expect(card.status).toBe(200);
    expect(card.headers.get('content-type')).toContain('image/jpeg');
    const sitemap = await html(site, '/software/sitemap.xml');
    expect(sitemap.status).toBe(200);
    for (const path of PAGES) expect(sitemap.body).toContain(`<loc>https://palawi.fr${path}</loc>`);
  });

  it('opens the thank-you window only from links and forms that start a download', async () => {
    github.down = false;
    const site = await start();
    for (const path of PAGES) {
      const { body } = await html(site, path);
      expect(body, path).toContain('<dialog class="thanks"');
      expect(body, path).toContain('Merci d’avoir téléchargé !');
    }
    const program = await html(site, '/software/palaclips');
    expect(program.body).toMatch(
      /<a class="gel" href="\/software\/dl\/palaclips" data-thanks="PalaClips" data-thanks-kind="windows" data-thanks-file="[^"]+\.exe · [^"]+" data-thanks-smartscreen="true"/,
    );
    const mod = await html(site, '/software/palas-item-clear');
    expect(mod.body).toMatch(/<form class="picker-form"[^>]*data-thanks="Pala's Item Clear" data-thanks-kind="mod"/);
    await site.stop();
  });

  it('serves the own page of chest counter, featured first on the home', async () => {
    github.down = false;
    const site = await start();
    const page = await html(site, '/software/chest-counter');
    expect(page.status).toBe(200);
    expect(page.body).toContain('Comment ton total se construit');
    expect(page.body).toContain('Et les autres compteurs de coffres ?');
    // The comparison names the other counters and links to the detail in the README.
    for (const tool of ['https://github.com/LED-N/Fortnite-ChestCounter', 'https://howmanychests.com/', 'https://lootcounter.com/']) {
      expect(page.body).toContain(`href="${tool}"`);
    }
    expect(page.body).toContain('href="https://github.com/Palawizard/chest-counter#how-it-compares"');
    expect(page.body.match(/<td class="(?:yes|no|partial)"/g)).toHaveLength(30);
    expect(page.body).toContain('Palawi.ChestCounter-win-Setup.exe');
    // Velopack's RELEASES and releases.win.json are left out: 23 real downloads in the fixture.
    expect(page.body).toContain('23 téléchargements');
    expect(page.body).toContain('id="smartscreen-title"');
    const home = await html(site, '/software/');
    expect(home.body.indexOf('Chest Counter')).toBeLessThan(home.body.indexOf('PalaClips'));
    expect(home.body).toMatch(/<h2 id="showcase-title"[^>]*><a href="\/software\/chest-counter"/);
  });

  it('leads back to palawi.fr from the header of every page', async () => {
    const site = await start();
    for (const path of PAGES) {
      const { body } = await html(site, path);
      const header = body.slice(body.indexOf('<header'), body.indexOf('</header>'));
      expect(header, path).toMatch(/<a class="pill back-home"[^>]*href="https:\/\/palawi\.fr\/"/);
    }
  });

  it('keeps the missing page out of search results', async () => {
    const site = await start();
    const { status, body } = await html(site, '/software/nothing-here');
    expect(status).toBe(404);
    expect(body).toContain('<meta name="robots" content="noindex"');
    expect(body).not.toContain('rel="canonical"');
  });
});
