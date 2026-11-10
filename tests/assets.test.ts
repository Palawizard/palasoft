import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findAsset, findModFile, modFiles, modMatrixSchema, pickInstaller } from '../src/lib/assets.ts';
import { latestRelease, releasesSchema, type Release } from '../src/lib/github.ts';
import { readFixture, releasesFixture } from './helpers/fixtures.ts';

const latestOf = (repo: string): Release => {
  const release = latestRelease(releasesSchema.parse(releasesFixture(repo)));
  if (release === undefined) throw new Error(`no release in fixture for ${repo}`);
  return release;
};

const installerPatternOf = (slug: string): string => {
  const entry = readFileSync(new URL(`../src/content/software/${slug}.md`, import.meta.url), 'utf8');
  const match = /^installerPattern: '(.+)'$/m.exec(entry);
  if (match?.[1] === undefined) throw new Error(`no installerPattern in ${slug}.md`);
  return match[1];
};

describe('pickInstaller', () => {
  it.each([
    ['palaclips', 'Palawizard/PalaClips', 'PalaClips_1.4.1_x64-setup.exe', 58331946],
    ['slbs-soundboard', 'Palawizard/slbs-soundboard', 'slbs-soundboard_0.5.0_x64.msi', 8105984],
    ['layout-manager', 'Palawizard/layout-manager-2', 'Layout.Manager.2_0.1.0-beta.2_x64-setup.exe', 4613312],
    ['silence-splitter', 'Palawizard/silence-splitter', 'Silence-Splitter-1.0.0-beta.2-x64-setup.exe', 184160999],
    ['timestamper', 'Palawizard/timestamper', 'Timestamper_0.1.0-beta.1_x64-setup.exe', 3023641],
  ])('picks the installer of %s from its entry rule', (slug, repo, name, size) => {
    const installer = pickInstaller(latestOf(repo), installerPatternOf(slug));
    expect(installer?.name).toBe(name);
    expect(installer?.size).toBe(size);
  });

  it('never picks a signature, update manifest, blockmap or checksum file', () => {
    for (const [slug, repo] of [
      ['palaclips', 'Palawizard/PalaClips'],
      ['slbs-soundboard', 'Palawizard/slbs-soundboard'],
      ['layout-manager', 'Palawizard/layout-manager-2'],
      ['silence-splitter', 'Palawizard/silence-splitter'],
      ['timestamper', 'Palawizard/timestamper'],
    ] as const) {
      for (const release of releasesSchema.parse(releasesFixture(repo))) {
        const name = pickInstaller(release, installerPatternOf(slug))?.name ?? '';
        expect(name).toMatch(/(-setup\.exe|\.msi)$/);
      }
    }
  });

  it('finds nothing when no file matches', () => {
    expect(pickInstaller(latestOf('Palawizard/timestamper'), '\\.dmg$')).toBeUndefined();
  });
});

describe('modFiles', () => {
  const matrix = modMatrixSchema.parse(readFixture('github/palasitemclear-version-matrix-v0.1.2.json'));
  const files = modFiles(latestOf('Palawizard/PalasItemClear'), matrix);

  it('maps every published jar to a band and a loader', () => {
    expect(files).toHaveLength(25);
    expect(new Set(files.map((file) => file.asset.name)).size).toBe(25);
  });

  it('uses the compile target in the jar name, not the band id', () => {
    expect(findModFile(files, 'fabric', '1.21.5-1.21.8')?.asset.name).toBe('palas-item-clear-1.21.8-fabric-0.1.2.jar');
    expect(findModFile(files, 'forge', '1.21-1.21.4')?.asset.name).toBe('palas-item-clear-1.21.1-forge-0.1.2.jar');
    expect(findModFile(files, 'neoforge', '26.1-26.2')?.asset.name).toBe('palas-item-clear-26.2-neoforge-0.1.2.jar');
  });

  it('keeps the separate Forge bands of 1.21.5 to 1.21.8', () => {
    expect(findModFile(files, 'forge', '1.21.5')?.asset.name).toBe('palas-item-clear-1.21.5-forge-0.1.2.jar');
    expect(findModFile(files, 'forge', '1.21.6-1.21.8')?.asset.name).toBe('palas-item-clear-1.21.8-forge-0.1.2.jar');
    expect(findModFile(files, 'forge', '1.21.5-1.21.8')).toBeUndefined();
    expect(findModFile(files, 'fabric', '1.21.5')).toBeUndefined();
  });

  it('leaves out a band whose jar is missing from the release', () => {
    const release = latestOf('Palawizard/PalasItemClear');
    const withoutOne = { ...release, assets: release.assets.filter((asset) => !asset.name.startsWith('palas-item-clear-26.2-fabric')) };
    const remaining = modFiles(withoutOne, matrix);
    expect(remaining).toHaveLength(24);
    expect(findModFile(remaining, 'fabric', '26.1-26.2')).toBeUndefined();
  });
});

describe('findAsset', () => {
  it('finds a file by exact name only', () => {
    const { assets } = latestOf('Palawizard/PalaClips');
    expect(findAsset(assets, 'latest.json')?.size).toBe(1947);
    expect(findAsset(assets, 'LATEST.JSON')).toBeUndefined();
    expect(findAsset(assets, '../latest.json')).toBeUndefined();
  });
});
