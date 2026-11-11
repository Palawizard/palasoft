import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { get, startFakeGitHub, startSite, type FakeGitHub, type Site } from './harness.ts';

const VB_CABLE = 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack46.zip';

const html = async (site: Site, path: string): Promise<string> => (await get(site, path)).text();

const companionBlock = (body: string, loader: string, band: string): string => {
  const start = body.indexOf(`data-companions data-loader="${loader}" data-band="${band}"`);
  if (start === -1) return '';
  const end = body.indexOf('data-companions data-loader=', start + 1);
  return body.slice(start, end === -1 ? body.indexOf('</form>', start) : end);
};

describe('what a program needs next to it', () => {
  let github: FakeGitHub;
  let dataDir: string;
  let site: Site;

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-dependencies-'));
    site = await startSite({ GITHUB_API_URL: github.url, DATA_DIR: dataDir });
  });

  afterAll(async () => {
    await site?.stop();
    await github?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('offers VB-CABLE under the Soundboard download button, from the VB-Audio page', async () => {
    const body = await html(site, '/software/slbs-soundboard');
    const hero = body.slice(body.indexOf('id="telecharger"'), body.indexOf('class="hero-media"'));
    expect(hero).toContain('Il te faut aussi VB-CABLE');
    expect(hero).toContain(`<a class="pill companion-link" href="${VB_CABLE}"`);
    expect(hero).toContain('VBCABLE_Driver_Pack46.zip');
    expect(github.requests).toContain('/vb-audio/Cable/');
    // Programs without a companion get no block.
    const other = await html(site, '/software/palaclips');
    expect(other.slice(other.indexOf('id="telecharger"'), other.indexOf('class="hero-media"'))).not.toContain('companion');
  });

  it('puts VB-CABLE and its steps in the thank-you window of every Soundboard download, the dock included', async () => {
    const body = await html(site, '/software/');
    const dock = body.slice(body.indexOf('class="dock'), body.indexOf('</nav>', body.indexOf('class="dock')));
    expect(dock).toMatch(/href="\/software\/dl\/slbs-soundboard"[^>]*data-thanks-companion="slbs-soundboard"/);
    expect(dock).not.toMatch(/href="\/software\/dl\/palaclips"[^>]*data-thanks-companion/);
    const start = body.indexOf('<template data-thanks-companion-for="slbs-soundboard"');
    expect(start).toBeGreaterThan(-1);
    const template = body.slice(start, body.indexOf('</template>', start));
    expect(template).toContain(VB_CABLE);
    expect(template).toContain('VBCABLE_Setup_x64');
    expect(template).toContain('Redémarre ton PC.');
  });

  it('lists the companion mods of each Fabric line and of Forge 1.20.1 under the mod button', async () => {
    const body = await html(site, '/software/palas-item-clear');
    const fabric = companionBlock(body, 'fabric', '1.21.5-1.21.8');
    expect(fabric).toContain('Fabric API');
    const expected: [string, string][] = [
      ['1.21.5', '0.128.2+1.21.5'],
      ['1.21.6', '0.128.2+1.21.6'],
      ['1.21.7', '0.129.0+1.21.7'],
      ['1.21.8', '0.136.1+1.21.8'],
    ];
    for (const [patch, version] of expected) {
      expect(fabric).toMatch(new RegExp(`class="pill patch numbers" href="https://cdn\\.modrinth\\.com/[^"]+" title="fabric-api-${version.replace(/[.+]/g, '\\$&')}\\.jar[^"]*"`));
      expect(fabric).toContain(patch);
    }
    expect(fabric).not.toContain('Architectury');

    const forge = companionBlock(body, 'forge', '1.20.1');
    expect(forge).toContain('Télécharger Architectury API');
    expect(forge).toContain('architectury-9.2.14-forge.jar');

    // The recorded answers have no file for these: the block links to Modrinth instead of breaking.
    const fabricOld = companionBlock(body, 'fabric', '1.20.1');
    expect(fabricOld).toContain('Toutes les versions de Fabric API sur Modrinth');
    expect(fabricOld).toContain('href="https://modrinth.com/mod/architectury-api/versions"');

    expect(companionBlock(body, 'neoforge', '1.21.9-1.21.10')).toBe('');
    expect(companionBlock(body, 'forge', '1.21.9-1.21.10')).toBe('');
  });

  it('marks the programs with an English interface on the English site only', async () => {
    const english = await html(site, '/software/en/');
    expect(english.match(/class="language-badge"/g)).toHaveLength(5);
    expect(english.match(/class="language-badge french-only"/g)).toHaveLength(2);
    expect(await html(site, '/software/')).not.toContain('class="language-badge"');
    expect(await html(site, '/software/en/timestamper')).toContain('Available in English');
    for (const slug of ['layout-manager', 'slbs-soundboard']) {
      const page = await html(site, `/software/en/${slug}`);
      expect(page).not.toContain('Available in English');
      expect(page).toContain('Only in French for now');
    }
    expect(await html(site, '/software/layout-manager')).not.toContain('En français seulement');
  });
});

describe('what a program needs when the publishers do not answer', () => {
  let github: FakeGitHub;
  let dataDir: string;
  let site: Site;

  beforeAll(async () => {
    github = await startFakeGitHub();
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-e2e-dependencies-down-'));
    // Releases come from a working fake, the dependency sources from nowhere.
    site = await startSite({
      GITHUB_API_URL: github.url,
      DATA_DIR: dataDir,
      MODRINTH_API_URL: 'http://127.0.0.1:9/modrinth/v2',
      VB_CABLE_PAGE_URL: 'http://127.0.0.1:9/Cable/',
    });
  });

  afterAll(async () => {
    await site?.stop();
    await github?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('still offers the known VB-CABLE package and the Modrinth pages', async () => {
    expect(await html(site, '/software/slbs-soundboard')).toContain(`href="${VB_CABLE}"`);
    const mod = await html(site, '/software/palas-item-clear');
    expect(companionBlock(mod, 'fabric', '1.21.5-1.21.8')).toContain('href="https://modrinth.com/mod/fabric-api/versions"');
  });
});
