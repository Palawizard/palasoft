import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { createCatalog, type SoftwareSource } from '../lib/catalog.ts';
import { readConfig } from '../lib/config.ts';

export type SoftwareEntry = CollectionEntry<'software'>;

export const catalog = createCatalog(readConfig(process.env), {
  onError: (error) => {
    console.warn(`[palasoft] remote data unavailable: ${error instanceof Error ? error.message : String(error)}`);
  },
});

export const toSource = (entry: SoftwareEntry): SoftwareSource =>
  entry.data.kind === 'windows'
    ? { slug: entry.id, repo: entry.data.repo, kind: 'windows', installerPattern: entry.data.installerPattern }
    : { slug: entry.id, repo: entry.data.repo, kind: 'minecraft-mod', versionMatrix: entry.data.versionMatrix };

export const findSoftware = async (slug: string | undefined): Promise<SoftwareEntry | undefined> =>
  slug === undefined ? undefined : getEntry('software', slug);

export const allSoftware = async (): Promise<SoftwareEntry[]> =>
  (await getCollection('software')).toSorted((a, b) => a.data.order - b.data.order);

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

export const softwarePath = (slug: string): string => `${base}/${slug}`;

export const redirect = (location: string): Response =>
  new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });

export const notFound = (): Response =>
  new Response('Fichier introuvable.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
