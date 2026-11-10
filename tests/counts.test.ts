import { describe, expect, it } from 'vitest';
import { githubDownloads, isCountedDownload } from '../src/lib/counts.ts';
import { releasesSchema } from '../src/lib/github.ts';
import { releasesFixture } from './helpers/fixtures.ts';

describe('isCountedDownload', () => {
  it.each([
    'latest.json',
    'latest.yml',
    'PalaClips_1.4.1_x64-setup.exe.sig',
    'slbs-soundboard_0.5.0_x64.msi.sig',
    'Silence-Splitter-1.0.0-beta.2-x64-setup.exe.blockmap',
    'release-checksums.txt',
    'RELEASES',
    'releases.win.json',
  ])('leaves out %s', (name) => {
    expect(isCountedDownload(name)).toBe(false);
  });

  it.each([
    'PalaClips_1.4.1_x64-setup.exe',
    'slbs-soundboard_0.5.0_x64.msi',
    'Silence-Splitter-1.0.0-beta.2-x64-setup.exe',
    'palas-item-clear-1.21.8-fabric-0.1.2.jar',
    'Palawi.ChestCounter-win-Setup.exe',
    'Palawi.ChestCounter-win-Portable.zip',
    'Palawi.ChestCounter-2.2.1-full.nupkg',
  ])('counts %s', (name) => {
    expect(isCountedDownload(name)).toBe(true);
  });
});

describe('githubDownloads', () => {
  it.each([
    ['Palawizard/PalaClips', 33],
    ['Palawizard/slbs-soundboard', 14],
    ['Palawizard/layout-manager-2', 5],
    ['Palawizard/silence-splitter', 2],
    ['Palawizard/timestamper', 2],
    ['Palawizard/PalasItemClear', 168],
  ])('adds up the real downloads of every release of %s', (repo, expected) => {
    expect(githubDownloads(releasesSchema.parse(releasesFixture(repo)))).toBe(expected);
  });

  it('ignores drafts', () => {
    const releases = releasesSchema.parse(releasesFixture('Palawizard/timestamper'));
    expect(githubDownloads(releases.map((release) => ({ ...release, draft: true })))).toBe(0);
  });
});
