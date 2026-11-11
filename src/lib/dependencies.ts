import { z } from 'zod';
import { StoreRequestError, type StoreClientOptions } from './stores.ts';

// What a program needs next to it: VB-CABLE for SLB's Soundboard, companion mods (Fabric API,
// Architectury API) for the Minecraft mod. Only links are resolved here: the files stay on their
// publishers' servers.

export interface DirectFile {
  url: string;
  file: string;
}

const USER_AGENT = 'palasoft (https://palawi.fr/software)';

const getText = async (url: string, options: StoreClientOptions): Promise<string> => {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  if (!response.ok) throw new StoreRequestError(url, response.status);
  return response.text();
};

// --- VB-CABLE -----------------------------------------------------------------------------------

export const VB_CABLE_PAGE = 'https://vb-audio.com/Cable/';

// Package linked by VB-Audio on 2026-11-11, used while the page cannot be read. Older packages
// stay online (Pack43, from 2015, is still linked), so this link keeps working after a new one.
export const VB_CABLE_FALLBACK: DirectFile = {
  url: 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack46.zip',
  file: 'VBCABLE_Driver_Pack46.zip',
};

const VB_CABLE_PACKAGE = /https:\/\/download\.vb-audio\.com\/Download_CABLE\/(VBCABLE_Driver_Pack(\d+)\.zip)/g;

/** The newest Windows package linked on the VB-CABLE page (the page also links an old one). */
export const parseVbCablePage = (html: string): DirectFile | undefined => {
  let best: { pack: number; file: DirectFile } | undefined;
  for (const match of html.matchAll(VB_CABLE_PACKAGE)) {
    const [url, file, pack] = match;
    if (file === undefined || pack === undefined) continue;
    const number = Number(pack);
    if (best === undefined || number > best.pack) best = { pack: number, file: { url, file } };
  }
  return best?.file;
};

export const fetchVbCable = async (pageUrl: string, options: StoreClientOptions): Promise<DirectFile> => {
  const found = parseVbCablePage(await getText(pageUrl, options));
  if (found === undefined) throw new Error(`No VB-CABLE package linked on ${pageUrl}`);
  return found;
};

// --- Minecraft versions -------------------------------------------------------------------------

const versionParts = (version: string): number[] | undefined =>
  /^\d+(?:\.\d+)*$/.test(version) ? version.split('.').map(Number) : undefined;

export const compareVersions = (a: string, b: string): number => {
  const left = versionParts(a) ?? [];
  const right = versionParts(b) ?? [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

/** Whether a release is inside a Maven range of the version matrix: `[1.20.1]`, `[1.21,1.21.5)`, `[26.1,)`. */
export const inRange = (version: string, range: string): boolean => {
  if (versionParts(version) === undefined) return false;
  const match = /^([[(])\s*([\d.]*)\s*(?:(,)\s*([\d.]*)\s*)?([\])])$/.exec(range.trim());
  if (match === null) return false;
  const [, open, low = '', comma, high = '', close] = match;
  if (comma === undefined) return open === '[' && close === ']' && compareVersions(version, low) === 0;
  if (low !== '') {
    const fromLow = compareVersions(version, low);
    if (fromLow < 0 || (fromLow === 0 && open === '(')) return false;
  }
  if (high !== '') {
    const toHigh = compareVersions(version, high);
    if (toHigh > 0 || (toHigh === 0 && close === ')')) return false;
  }
  return true;
};

const gameVersionsSchema = z.array(z.object({ version: z.string(), version_type: z.string() }));

/** Every Minecraft release known to Modrinth (no snapshots), oldest first. */
export const fetchMinecraftReleases = async (options: StoreClientOptions): Promise<string[]> => {
  const url = `${options.apiUrl}/tag/game_version`;
  const tags = gameVersionsSchema.parse(JSON.parse(await getText(url, options)));
  return tags
    .filter((tag) => tag.version_type === 'release' && versionParts(tag.version) !== undefined)
    .map((tag) => tag.version)
    .toSorted(compareVersions);
};

export const releasesInRange = (releases: readonly string[], range: string): string[] =>
  releases.filter((release) => inRange(release, range));

// --- Companion mods on Modrinth -----------------------------------------------------------------

const projectVersionsSchema = z.array(
  z.object({
    version_number: z.string(),
    version_type: z.string(),
    game_versions: z.array(z.string()),
    loaders: z.array(z.string()),
    files: z.array(z.object({ url: z.url(), filename: z.string(), primary: z.boolean(), size: z.number().int().nonnegative() })),
  }),
);

export type ProjectVersions = z.infer<typeof projectVersionsSchema>;

export const companionFileSchema = z.object({
  patches: z.array(z.string()),
  version: z.string(),
  url: z.url(),
  file: z.string(),
  size: z.number().int().nonnegative(),
});

/** One file of a companion mod and the Minecraft releases it is the newest stable file for. */
export type CompanionFile = z.infer<typeof companionFileSchema>;

/**
 * For each Minecraft release, the newest stable file of the project for that loader (Modrinth lists
 * versions newest first). Releases sharing a file are grouped, in the order of `patches`.
 */
export const pickCompanionFiles = (
  versions: ProjectVersions,
  loader: string,
  patches: readonly string[],
): CompanionFile[] => {
  const files: CompanionFile[] = [];
  for (const patch of patches) {
    const version = versions.find(
      (candidate) =>
        candidate.version_type === 'release' && candidate.loaders.includes(loader) && candidate.game_versions.includes(patch),
    );
    const file = version?.files.find((candidate) => candidate.primary) ?? version?.files[0];
    if (version === undefined || file === undefined) continue;
    const same = files.find((known) => known.url === file.url);
    if (same === undefined) {
      files.push({ patches: [patch], version: version.version_number, url: file.url, file: file.filename, size: file.size });
    } else {
      same.patches.push(patch);
    }
  }
  return files;
};

export const fetchCompanionFiles = async (
  project: string,
  loader: string,
  patches: readonly string[],
  options: StoreClientOptions,
): Promise<CompanionFile[]> => {
  const query = new URLSearchParams({ loaders: JSON.stringify([loader]), game_versions: JSON.stringify(patches) });
  const url = `${options.apiUrl}/project/${encodeURIComponent(project)}/version?${query.toString()}`;
  const versions = projectVersionsSchema.parse(JSON.parse(await getText(url, options)));
  return pickCompanionFiles(versions, loader, patches);
};

export const modrinthVersionsPage = (project: string): string => `https://modrinth.com/mod/${project}/versions`;
