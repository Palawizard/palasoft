import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  compareVersions,
  fetchCompanionFiles,
  fetchMinecraftReleases,
  fetchVbCable,
  inRange,
  parseVbCablePage,
  pickCompanionFiles,
  releasesInRange,
  VB_CABLE_FALLBACK,
  type ProjectVersions,
} from '../src/lib/dependencies.ts';
import { StoreRequestError } from '../src/lib/stores.ts';
import { jsonResponse, readFixture } from './helpers/fixtures.ts';

const options = (fetchImpl: typeof fetch) => ({ apiUrl: 'https://api.modrinth.test/v2', timeoutMs: 1000, fetch: fetchImpl });
const cablePage = readFileSync(new URL('./fixtures/vb-audio/cable-page-excerpt.html', import.meta.url), 'utf8');

describe('VB-CABLE', () => {
  it('takes the newest Windows package of the recorded page, not the old one', () => {
    expect(parseVbCablePage(cablePage)).toEqual({
      url: 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack46.zip',
      file: 'VBCABLE_Driver_Pack46.zip',
    });
  });

  it('follows a newer package and ignores the Mac one', () => {
    const page = `${cablePage}<a href="https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack47.zip">new</a>`;
    expect(parseVbCablePage(page)?.file).toBe('VBCABLE_Driver_Pack47.zip');
    expect(parseVbCablePage('<a href="https://download.vb-audio.com/Download_MAC/VBCable_MACDriver_Pack108.zip">')).toBeUndefined();
  });

  it('keeps a fallback that matches the recorded page', () => {
    expect(parseVbCablePage(cablePage)).toEqual(VB_CABLE_FALLBACK);
  });

  it('fails when the page links no package', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('<html></html>'));
    await expect(fetchVbCable('https://vb-audio.test/Cable/', options(fetchImpl))).rejects.toThrow(/No VB-CABLE package/);
    const failing = vi.fn<typeof fetch>(async () => new Response('', { status: 503 }));
    await expect(fetchVbCable('https://vb-audio.test/Cable/', options(failing))).rejects.toBeInstanceOf(StoreRequestError);
  });
});

describe('Minecraft versions', () => {
  it('orders releases by number, the new numbering included', () => {
    expect(['1.21.10', '26.1', '1.21.9', '1.21', '26.1.2'].toSorted(compareVersions)).toEqual([
      '1.21',
      '1.21.9',
      '1.21.10',
      '26.1',
      '26.1.2',
    ]);
  });

  it.each([
    ['1.20.1', '[1.20.1]', true],
    ['1.20.2', '[1.20.1]', false],
    ['1.21', '[1.21,1.21.5)', true],
    ['1.21.4', '[1.21,1.21.5)', true],
    ['1.21.5', '[1.21,1.21.5)', false],
    ['1.21.8', '[1.21.5,1.21.9)', true],
    ['26.2', '[26.1,26.3)', true],
    ['26.3', '[26.1,26.3)', false],
    ['26.4', '[26.1,)', true],
    ['1.21.11-rc1', '[1.21.11]', false],
  ])('%s in %s: %s', (version, range, expected) => {
    expect(inRange(version, range)).toBe(expected);
  });

  it('lists the recorded releases of a band, without snapshots', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(readFixture('modrinth/tag-game-version.json')));
    const releases = await fetchMinecraftReleases(options(fetchImpl));
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.modrinth.test/v2/tag/game_version');
    expect(releases).not.toContain('26.3-snapshot-1');
    expect(releasesInRange(releases, '[1.21,1.21.5)')).toEqual(['1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4']);
    expect(releasesInRange(releases, '[26.1,26.3)')).toEqual(['26.1', '26.1.1', '26.1.2', '26.2']);
  });
});

describe('companion mods', () => {
  const fabricApi = readFixture('modrinth/fabric-api-fabric-1.21.5-1.21.8.json') as ProjectVersions;

  it('picks the newest stable Fabric API file for each release of the band', () => {
    const files = pickCompanionFiles(fabricApi, 'fabric', ['1.21.5', '1.21.6', '1.21.7', '1.21.8']);
    expect(files.map((file) => [file.patches, file.version])).toEqual([
      [['1.21.5'], '0.128.2+1.21.5'],
      [['1.21.6'], '0.128.2+1.21.6'],
      [['1.21.7'], '0.129.0+1.21.7'],
      [['1.21.8'], '0.136.1+1.21.8'],
    ]);
    expect(files[3]?.url).toMatch(/^https:\/\/cdn\.modrinth\.com\/data\/P7dR8mSH\/versions\/.+\.jar$/);
    expect(files[3]?.file).toBe('fabric-api-0.136.1+1.21.8.jar');
  });

  it('groups releases that share a file and skips releases without one', () => {
    const architectury = readFixture('modrinth/architectury-api-forge-1.20.1.json') as ProjectVersions;
    const files = pickCompanionFiles(architectury, 'forge', ['1.20', '1.20.1', '1.20.2']);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ patches: ['1.20', '1.20.1'], version: '9.2.14+forge', file: 'architectury-9.2.14-forge.jar' });
  });

  it('ignores files of another loader and test builds', () => {
    const versions: ProjectVersions = [
      { version_number: '2.0-beta', version_type: 'beta', game_versions: ['1.21.8'], loaders: ['fabric'], files: [{ url: 'https://cdn.test/beta.jar', filename: 'beta.jar', primary: true, size: 1 }] },
      { version_number: '1.0-forge', version_type: 'release', game_versions: ['1.21.8'], loaders: ['forge'], files: [{ url: 'https://cdn.test/forge.jar', filename: 'forge.jar', primary: true, size: 1 }] },
      { version_number: '1.0', version_type: 'release', game_versions: ['1.21.8'], loaders: ['fabric'], files: [{ url: 'https://cdn.test/sources.jar', filename: 'sources.jar', primary: false, size: 1 }, { url: 'https://cdn.test/main.jar', filename: 'main.jar', primary: true, size: 2 }] },
    ];
    expect(pickCompanionFiles(versions, 'fabric', ['1.21.8'])).toEqual([
      { patches: ['1.21.8'], version: '1.0', url: 'https://cdn.test/main.jar', file: 'main.jar', size: 2 },
    ]);
  });

  it('asks Modrinth for the loader and the releases of the band', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(fabricApi));
    const files = await fetchCompanionFiles('fabric-api', 'fabric', ['1.21.7', '1.21.8'], options(fetchImpl));
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/v2/project/fabric-api/version');
    expect(url.searchParams.get('loaders')).toBe('["fabric"]');
    expect(url.searchParams.get('game_versions')).toBe('["1.21.7","1.21.8"]');
    expect(files.map((file) => file.version)).toEqual(['0.129.0+1.21.7', '0.136.1+1.21.8']);
  });
});
