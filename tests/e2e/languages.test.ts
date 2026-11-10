import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { get, startFakeGitHub, startSite, type FakeGitHub, type Site } from './harness.ts';

const SLUGS = ['', 'palaclips', 'slbs-soundboard', 'layout-manager', 'silence-splitter', 'timestamper', 'palas-item-clear', 'chest-counter'];
const french = (slug: string): string => `/software/${slug}`;
const english = (slug: string): string => (slug === '' ? '/software/en/' : `/software/en/${slug}`);

const ENGLISH_SYSTEM = { 'accept-language': 'en-US,en;q=0.9' };
const FRENCH_SYSTEM = { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' };

const text = async (response: Response): Promise<string> => response.text();

describe('the two languages', () => {
  let github: FakeGitHub;
  let dataDir: string;
  let site: Site;

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-languages-'));
    site = await startSite({ GITHUB_API_URL: github.url, DATA_DIR: dataDir });
  });

  afterAll(async () => {
    await site?.stop();
    await github?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('serves every page in English under /software/en', async () => {
    for (const slug of SLUGS) {
      const response = await get(site, english(slug));
      const body = await text(response);
      expect(response.status, slug).toBe(200);
      expect(body, slug).toContain('<html lang="en"');
      expect(body, slug).toContain('<meta property="og:locale" content="en_US"');
      expect(body, slug).toContain('Thanks for downloading!');
      expect(body, slug).toMatch(/<button[^>]*data-sky-toggle[^>]*aria-label="Switch to the dark theme"/);
      expect(body, slug).not.toContain('Merci d’avoir téléchargé');
      expect(body, slug).not.toContain('téléchargements');
    }
  });

  it('links each page to its other language for search engines', async () => {
    for (const slug of SLUGS) {
      for (const path of [french(slug), english(slug)]) {
        const head = (await text(await get(site, path))).split('</head>')[0] ?? '';
        expect(head, path).toContain(`<link rel="canonical" href="https://palawi.fr${path}"`);
        expect(head, path).toContain(`<link rel="alternate" hreflang="fr" href="https://palawi.fr${french(slug)}"`);
        expect(head, path).toContain(`<link rel="alternate" hreflang="en" href="https://palawi.fr${english(slug)}"`);
        expect(head, path).toContain(`<link rel="alternate" hreflang="x-default" href="https://palawi.fr${french(slug)}"`);
      }
    }
    const sitemap = await text(await get(site, '/software/sitemap.xml'));
    for (const slug of SLUGS) {
      expect(sitemap).toContain(`<loc>https://palawi.fr${english(slug)}</loc>`);
      expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="en" href="https://palawi.fr${english(slug)}"/>`);
    }
  });

  it('translates the program pages', async () => {
    const program = await text(await get(site, '/software/en/palaclips'));
    expect(program).toContain('What it does');
    expect(program).toContain('What you need');
    expect(program).toContain('Windows 11 (PalaClips doesn’t work on Windows 10)');
    expect(program).toMatch(/<a class="gel" href="\/software\/dl\/palaclips"[^>]*data-thanks="PalaClips"/);
    const chests = await text(await get(site, '/software/en/chest-counter'));
    expect(chests).toContain('How your total adds up');
    expect(chests).toContain('23 downloads');
    const mod = await text(await get(site, '/software/en/palas-item-clear'));
    expect(mod).toContain('<input type="hidden" name="lang" value="en"');
    const home = await text(await get(site, '/software/en/'));
    expect(home).toContain('href="/software/en/chest-counter"');
  });

  it('follows the language of the system on the French address, but never for crawlers', async () => {
    const englishVisit = await get(site, '/software/palaclips?ref=hub', ENGLISH_SYSTEM);
    expect(englishVisit.status).toBe(302);
    expect(englishVisit.headers.get('location')).toBe('/software/en/palaclips?ref=hub');
    expect(englishVisit.headers.get('vary')).toContain('Accept-Language');
    const germanVisit = await get(site, '/software/', { 'accept-language': 'de-DE,de;q=0.9' });
    expect(germanVisit.headers.get('location')).toBe('/software/en/');
    expect((await get(site, '/software/', FRENCH_SYSTEM)).status).toBe(200);
    expect((await get(site, '/software/')).status).toBe(200);
    // A link to the English page is always honored, whatever the system says.
    expect((await get(site, '/software/en/', FRENCH_SYSTEM)).status).toBe(200);
  });

  it('remembers the language picked with the switch', async () => {
    const pick = await get(site, `/software/lang/fr?next=${encodeURIComponent('/software/palaclips')}`);
    expect(pick.status).toBe(302);
    expect(pick.headers.get('location')).toBe('/software/palaclips');
    const cookie = pick.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^palasoft-lang=fr;/);
    expect(cookie).toContain('Path=/software/');
    const visit = await get(site, '/software/palaclips', { ...ENGLISH_SYSTEM, cookie: 'palasoft-lang=fr' });
    expect(visit.status).toBe(200);
    const backToFrench = await get(site, '/software/en/palaclips', { cookie: 'palasoft-lang=fr' });
    expect(backToFrench.headers.get('location')).toBe('/software/palaclips');
    const picked = await get(site, '/software/palaclips', { cookie: 'palasoft-lang=en' });
    expect(picked.headers.get('location')).toBe('/software/en/palaclips');
  });

  it('only sends the switch back to a page of the site', async () => {
    for (const next of ['https://example.com/', '//example.com/', '/\\example.com', '/other/']) {
      const pick = await get(site, `/software/lang/en?next=${encodeURIComponent(next)}`);
      expect(pick.headers.get('location'), next).toBe('/software/');
    }
    expect((await get(site, '/software/lang/de')).status).toBe(404);
  });

  it('shows the switch with the current language marked', async () => {
    const body = await text(await get(site, '/software/en/timestamper'));
    const header = body.slice(body.indexOf('<header'), body.indexOf('</header>'));
    expect(header).toMatch(/<a[^>]*href="\/software\/lang\/fr\?next=%2Fsoftware%2Ftimestamper"[^>]*hreflang="fr"/);
    expect(header).toMatch(/<a[^>]*href="\/software\/lang\/en\?next=%2Fsoftware%2Fen%2Ftimestamper"[^>]*aria-current="true"/);
  });

  it('keeps the language through the download routes and the missing page', async () => {
    const mod = await get(site, '/software/dl/palas-item-clear?lang=en');
    expect(mod.headers.get('location')).toBe('/software/en/palas-item-clear#telecharger');
    const missing = await get(site, '/software/en/nothing-here');
    expect(missing.status).toBe(404);
    expect(await text(missing)).toContain('Page not found');
  });
});
