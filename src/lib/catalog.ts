import { z } from 'zod';
import { pickInstaller, modFiles, modMatrixSchema, type ModFile, type ModMatrix } from './assets.ts';
import { createCachedSource, type CachedSource } from './cache.ts';
import type { ServerConfig } from './config.ts';
import {
  fetchReleases,
  fetchRepoJsonFile,
  isBeta,
  latestRelease,
  releasesSchema,
  versionLabel,
  type Asset,
  type GitHubClientOptions,
} from './github.ts';

export type SoftwareSource =
  | { slug: string; repo: string; kind: 'windows'; installerPattern: string }
  | { slug: string; repo: string; kind: 'minecraft-mod'; versionMatrix: string };

const snapshotSchema = z.object({
  releases: releasesSchema,
  matrix: modMatrixSchema.nullable(),
});

type Snapshot = z.infer<typeof snapshotSchema>;

export interface ReleaseInfo {
  version: string;
  isBeta: boolean;
  publishedAt: string | null;
  pageUrl: string;
  assets: Asset[];
}

export type ReleaseView =
  | { state: 'unavailable'; historyUrl: string }
  | { state: 'none'; historyUrl: string }
  | {
      state: 'ready';
      stale: boolean;
      fetchedAt: number;
      historyUrl: string;
      release: ReleaseInfo;
      installer: Asset | undefined;
      modFiles: ModFile[];
    };

export interface Catalog {
  release: (source: SoftwareSource) => Promise<ReleaseView>;
}

const RETRY_AFTER_FAILURE_MS = 60 * 1000;

export const historyUrl = (repo: string): string => `https://github.com/${repo}/releases`;

export const createCatalog = (
  config: ServerConfig,
  options: { fetch?: typeof fetch; onError?: (error: unknown) => void } = {},
): Catalog => {
  const client: GitHubClientOptions = {
    apiUrl: config.githubApiUrl,
    token: config.githubToken,
    timeoutMs: config.requestTimeoutMs,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  };
  const sources = new Map<string, CachedSource<Snapshot>>();

  const loadSnapshot = async (source: SoftwareSource): Promise<Snapshot> => {
    const releases = await fetchReleases(source.repo, client);
    const latest = latestRelease(releases);
    let matrix: ModMatrix | null = null;
    if (source.kind === 'minecraft-mod' && latest !== undefined) {
      const file = await fetchRepoJsonFile(source.repo, latest.tag_name, source.versionMatrix, client);
      matrix = modMatrixSchema.parse(file);
    }
    return { releases, matrix };
  };

  const sourceFor = (source: SoftwareSource): CachedSource<Snapshot> => {
    let cached = sources.get(source.slug);
    if (cached === undefined) {
      cached = createCachedSource({
        key: `software-${source.slug}`,
        ttlMs: config.cacheTtlMs,
        retryAfterFailureMs: RETRY_AFTER_FAILURE_MS,
        dataDir: config.dataDir,
        schema: snapshotSchema,
        load: () => loadSnapshot(source),
        ...(options.onError === undefined ? {} : { onError: options.onError }),
      });
      sources.set(source.slug, cached);
    }
    return cached;
  };

  const release = async (source: SoftwareSource): Promise<ReleaseView> => {
    const history = historyUrl(source.repo);
    const result = await sourceFor(source).get();
    if (result.state === 'unavailable') return { state: 'unavailable', historyUrl: history };
    const latest = latestRelease(result.value.releases);
    if (latest === undefined) return { state: 'none', historyUrl: history };
    return {
      state: 'ready',
      stale: result.state === 'stale',
      fetchedAt: result.fetchedAt,
      historyUrl: history,
      release: {
        version: versionLabel(latest),
        isBeta: isBeta(latest),
        publishedAt: latest.published_at,
        pageUrl: latest.html_url,
        assets: latest.assets,
      },
      installer: source.kind === 'windows' ? pickInstaller(latest, source.installerPattern) : undefined,
      modFiles:
        source.kind === 'minecraft-mod' && result.value.matrix !== null
          ? modFiles(latest, result.value.matrix)
          : [],
    };
  };

  return { release };
};
