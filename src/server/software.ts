import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { createCatalog, type ReleaseView, type SoftwareSource } from '../lib/catalog.ts';
import { formatSize } from '../lib/format.ts';
import { readConfig } from '../lib/config.ts';
import { modrinthSlug } from '../lib/stores.ts';

export type SoftwareEntry = CollectionEntry<'software'>;

export const catalog = createCatalog(readConfig(process.env), {
  onError: (error) => {
    console.warn(`[palasoft] remote data unavailable: ${error instanceof Error ? error.message : String(error)}`);
  },
});

export const toSource = (entry: SoftwareEntry): SoftwareSource =>
  entry.data.kind === 'windows'
    ? { slug: entry.id, repo: entry.data.repo, kind: 'windows', installerPattern: entry.data.installerPattern }
    : {
        slug: entry.id,
        repo: entry.data.repo,
        kind: 'minecraft-mod',
        versionMatrix: entry.data.versionMatrix,
        modrinthSlug: modrinthSlug(entry.data.modrinth),
        curseforgeId: entry.data.curseforgeId,
      };

export const releaseOf = (entry: SoftwareEntry): Promise<ReleaseView> => catalog.release(toSource(entry));

export const downloadsOf = (entry: SoftwareEntry): Promise<number | undefined> => catalog.downloads(toSource(entry));

export interface SoftwareWithRelease {
  entry: SoftwareEntry;
  view: ReleaseView;
  downloads: number | undefined;
}

export const allSoftwareWithReleases = async (): Promise<SoftwareWithRelease[]> =>
  Promise.all(
    (await allSoftware()).map(async (entry) => {
      const [view, downloads] = await Promise.all([releaseOf(entry), downloadsOf(entry)]);
      return { entry, view, downloads };
    }),
  );

export const findSoftware = async (slug: string | undefined): Promise<SoftwareEntry | undefined> =>
  slug === undefined ? undefined : getEntry('software', slug);

export const allSoftware = async (): Promise<SoftwareEntry[]> =>
  (await getCollection('software')).toSorted((a, b) => a.data.order - b.data.order);

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

export const homePath = `${base}/`;

export const softwarePath = (slug: string): string => `${base}/${slug}`;

export const downloadPath = (slug: string, file?: string): string =>
  file === undefined ? `${base}/dl/${slug}` : `${base}/dl/${slug}/${encodeURIComponent(file)}`;

export const redirect = (location: string): Response =>
  new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });

export const notFound = (): Response => new Response(null, { status: 404 });

// Data attributes that open the thank-you window (components/DownloadThanks.astro) when the link starts a download.
// Empty when the link leads to a page instead (GitHub down, no installer in the release).
export const thanksAttributes = (entry: SoftwareEntry, view: ReleaseView): Record<string, string> => {
  if (entry.data.kind !== 'windows' || view.state !== 'ready' || view.installer === undefined) return {};
  return {
    'data-thanks': entry.data.name,
    'data-thanks-kind': 'windows',
    'data-thanks-file': `${view.installer.name} · ${formatSize(view.installer.size)}`,
    'data-thanks-smartscreen': String(entry.data.unsignedInstaller),
  };
};
