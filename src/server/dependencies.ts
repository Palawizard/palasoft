import { z } from 'zod';
import { createCachedSource, type CachedSource } from '../lib/cache.ts';
import type { ReleaseView } from '../lib/catalog.ts';
import { readConfig } from '../lib/config.ts';
import {
  companionFileSchema,
  fetchCompanionFiles,
  fetchMinecraftReleases,
  fetchVbCable,
  modrinthVersionsPage,
  releasesInRange,
  VB_CABLE_FALLBACK,
  VB_CABLE_PAGE,
  type CompanionFile,
  type DirectFile,
} from '../lib/dependencies.ts';
import type { StoreClientOptions } from '../lib/stores.ts';
import type { SoftwareEntry } from './software.ts';

// Links to what a program needs next to it, resolved on the server and cached like the releases.
// When a source cannot be read, the page still offers a link: the last saved copy, a known package
// or the publisher's page.

const config = readConfig(process.env);
// These links change a few times a year: no need to ask every ten minutes like for the releases.
const TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

const client = (apiUrl: string): StoreClientOptions => ({ apiUrl, timeoutMs: config.requestTimeoutMs });

const onError = (error: unknown): void => {
  console.warn(`[palasoft] dependency link unavailable: ${error instanceof Error ? error.message : String(error)}`);
};

const sources = new Map<string, CachedSource<unknown>>();

const cached = <T>(key: string, schema: z.ZodType<T>, load: () => Promise<T>): CachedSource<T> => {
  let source = sources.get(key) as CachedSource<T> | undefined;
  if (source === undefined) {
    source = createCachedSource({ key, ttlMs: TTL_MS, retryAfterFailureMs: RETRY_AFTER_FAILURE_MS, dataDir: config.dataDir, schema, load, onError });
    sources.set(key, source as CachedSource<unknown>);
  }
  return source;
};

const valueOf = async <T>(source: CachedSource<T>): Promise<T | undefined> => {
  const result = await source.get();
  return result.state === 'unavailable' ? undefined : result.value;
};

// --- VB-CABLE -----------------------------------------------------------------------------------

export interface CompanionProgram {
  id: 'vb-cable';
  name: string;
  publisher: string;
  pageUrl: string;
  download: DirectFile;
}

export const companionProgram = async (entry: SoftwareEntry): Promise<CompanionProgram | undefined> => {
  if (entry.data.kind !== 'windows' || entry.data.companion !== 'vb-cable') return undefined;
  const download = await valueOf(
    cached('vb-cable', z.object({ url: z.url(), file: z.string() }), () =>
      fetchVbCable(config.vbCablePageUrl, client(config.vbCablePageUrl)),
    ),
  );
  return { id: 'vb-cable', name: 'VB-CABLE', publisher: 'VB-Audio', pageUrl: VB_CABLE_PAGE, download: download ?? VB_CABLE_FALLBACK };
};

// --- Companion mods -----------------------------------------------------------------------------

export interface CompanionMod {
  name: string;
  /** Modrinth page listing every file, for the Minecraft releases without a file below. */
  pageUrl: string;
  /** Minecraft releases of the band, oldest first. */
  patches: string[];
  files: CompanionFile[];
}

export interface BandCompanions {
  loader: string;
  bandId: string;
  mods: CompanionMod[];
}

const minecraftReleases = (): Promise<string[] | undefined> =>
  valueOf(cached('modrinth-minecraft-releases', z.array(z.string()), () => fetchMinecraftReleases(client(config.modrinthApiUrl))));

const cacheKey = (...parts: string[]): string => parts.join('-').toLowerCase().replace(/[^a-z0-9._-]/g, '_');

/** The companion mods of each loader and Minecraft line of the latest release that needs some. */
export const modCompanions = async (entry: SoftwareEntry, view: ReleaseView): Promise<BandCompanions[]> => {
  if (entry.data.kind !== 'minecraft-mod' || view.state !== 'ready' || entry.data.companions.length === 0) return [];
  const companions = entry.data.companions;
  const releases = await minecraftReleases();
  const bands = await Promise.all(
    view.modFiles.map(async (file): Promise<BandCompanions> => {
      const patches = releases === undefined ? [] : releasesInRange(releases, file.minecraftRange);
      const needed = companions.filter(
        (companion) => companion.loaders.includes(file.loader) && (companion.bands?.includes(file.bandId) ?? true),
      );
      const mods = await Promise.all(
        needed.map(async (companion): Promise<CompanionMod> => {
          const files =
            patches.length === 0
              ? undefined
              : await valueOf(
                  cached(cacheKey('modrinth', companion.modrinth, file.loader, file.bandId), z.array(companionFileSchema), () =>
                    fetchCompanionFiles(companion.modrinth, file.loader, patches, client(config.modrinthApiUrl)),
                  ),
                );
          return { name: companion.name, pageUrl: modrinthVersionsPage(companion.modrinth), patches, files: files ?? [] };
        }),
      );
      return { loader: file.loader, bandId: file.bandId, mods };
    }),
  );
  return bands.filter((band) => band.mods.length > 0);
};

/** Minecraft releases of a companion mod that have no direct file (Modrinth down, file not published yet). */
export const missingPatches = (mod: CompanionMod): string[] => {
  const covered = new Set(mod.files.flatMap((file) => file.patches));
  return mod.patches.filter((patch) => !covered.has(patch));
};
