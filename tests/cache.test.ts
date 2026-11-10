import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCachedSource } from '../src/lib/cache.ts';
import { releasesSchema, type Release } from '../src/lib/github.ts';
import { releasesFixture } from './helpers/fixtures.ts';

const TTL = 10 * 60 * 1000;
const RETRY = 60 * 1000;

const timestamperReleases = (): Release[] => releasesSchema.parse(releasesFixture('Palawizard/timestamper'));
const palaclipsReleases = (): Release[] => releasesSchema.parse(releasesFixture('Palawizard/PalaClips'));

describe('createCachedSource', () => {
  let dataDir: string;
  let clock: number;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'palasoft-cache-'));
    clock = 1_000_000;
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  const source = (load: () => Promise<Release[]>) =>
    createCachedSource({
      key: 'releases-timestamper',
      ttlMs: TTL,
      retryAfterFailureMs: RETRY,
      dataDir,
      schema: releasesSchema,
      load,
      now: () => clock,
      onError: () => {},
    });

  it('serves a warm cache without calling GitHub again', async () => {
    const load = vi.fn(async () => timestamperReleases());
    const cache = source(load);
    await cache.get();
    clock += TTL - 1;
    const result = await cache.get();
    expect(result.state).toBe('fresh');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads once the cache has expired', async () => {
    const load = vi.fn(async () => timestamperReleases());
    const cache = source(load);
    await cache.get();
    clock += TTL;
    const result = await cache.get();
    expect(result).toMatchObject({ state: 'fresh', fetchedAt: clock });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one request between concurrent readers', async () => {
    const load = vi.fn(async () => timestamperReleases());
    const cache = source(load);
    await Promise.all([cache.get(), cache.get(), cache.get()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('writes the last good answer to disk', async () => {
    const cache = source(async () => timestamperReleases());
    await cache.get();
    const saved = JSON.parse(await readFile(join(dataDir, 'releases-timestamper.json'), 'utf8'));
    expect(saved).toEqual({ fetchedAt: clock, value: timestamperReleases() });
  });

  it('falls back to the copy in memory when GitHub fails after expiry', async () => {
    const load = vi.fn(async () => timestamperReleases());
    const cache = source(load);
    await cache.get();
    const firstFetch = clock;
    clock += TTL;
    load.mockRejectedValueOnce(new Error('GitHub is down'));
    const result = await cache.get();
    expect(result.state).toBe('stale');
    expect(result).toMatchObject({ value: timestamperReleases(), fetchedAt: firstFetch });
  });

  it('falls back to the copy on disk when GitHub is down at startup', async () => {
    await source(async () => palaclipsReleases()).get();
    clock += TTL;
    const restarted = source(async () => {
      throw new Error('GitHub is down');
    });
    const result = await restarted.get();
    expect(result).toMatchObject({ state: 'stale', value: palaclipsReleases() });
  });

  it('reports unavailable when GitHub is down and there is no copy', async () => {
    const cache = source(async () => {
      throw new Error('GitHub is down');
    });
    expect(await cache.get()).toEqual({ state: 'unavailable' });
  });

  it('ignores a damaged copy on disk', async () => {
    await writeFile(join(dataDir, 'releases-timestamper.json'), '{"fetchedAt":1,"value":[{"tag_name":1}]}');
    const cache = source(async () => {
      throw new Error('GitHub is down');
    });
    expect(await cache.get()).toEqual({ state: 'unavailable' });
  });

  it('waits before asking GitHub again after a failure', async () => {
    const load = vi.fn(async (): Promise<Release[]> => {
      throw new Error('GitHub is down');
    });
    const cache = source(load);
    await cache.get();
    clock += RETRY - 1;
    await cache.get();
    expect(load).toHaveBeenCalledTimes(1);
    clock += 1;
    load.mockResolvedValueOnce(timestamperReleases());
    expect((await cache.get()).state).toBe('fresh');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('rejects a key that could escape the data folder', () => {
    expect(() =>
      createCachedSource({
        key: '../outside',
        ttlMs: TTL,
        retryAfterFailureMs: RETRY,
        dataDir,
        schema: releasesSchema,
        load: async () => [],
      }),
    ).toThrow();
  });
});
