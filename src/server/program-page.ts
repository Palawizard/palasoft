import { getImage } from 'astro:assets';
import type { ReleaseView } from '../lib/catalog.ts';
import { SITE_NAME, breadcrumbJsonLd, softwareJsonLd, type JsonLd } from '../lib/seo.ts';
import { downloadPath, downloadsOf, homePath, releaseOf, softwarePath, type SoftwareEntry } from './software.ts';

export interface ShareImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface ProgramPage {
  view: ReleaseView;
  downloads: number | undefined;
  title: string;
  shareImage: ShareImage | undefined;
  jsonLd: JsonLd[];
}

// Everything a program page (generic or custom) needs besides its markup: release, counts, title, share picture
// and structured data.
export const programPage = async (entry: SoftwareEntry, site: URL | undefined): Promise<ProgramPage> => {
  const [view, downloads] = await Promise.all([releaseOf(entry), downloadsOf(entry)]);
  const { data } = entry;
  const [mainShot] = data.screenshots;

  // A landscape first screenshot is the picture of a shared link (never enlarged, JPEG so every network can read it);
  // otherwise the PalaSoft card is.
  const shareSource = mainShot !== undefined && mainShot.src.width > mainShot.src.height ? mainShot : undefined;
  const shareShot =
    shareSource === undefined
      ? undefined
      : await getImage({ src: shareSource.src, width: Math.min(1200, shareSource.src.width), format: 'jpeg', quality: 85 });
  const shareImage =
    shareSource === undefined || shareShot === undefined
      ? undefined
      : { src: shareShot.src, width: Number(shareShot.attributes.width), height: Number(shareShot.attributes.height), alt: shareSource.alt };

  const absolute = (path: string): string => new URL(path, site).href;
  const pageUrl = absolute(softwarePath(entry.id));
  const isMod = data.kind === 'minecraft-mod';
  const title = isMod ? `${data.name}, mod Minecraft gratuit | ${SITE_NAME}` : `Télécharger ${data.name} pour Windows | ${SITE_NAME}`;
  const jsonLd = [
    softwareJsonLd({
      name: data.name,
      description: data.tagline,
      url: pageUrl,
      category: data.category,
      kind: data.kind,
      version: view.state === 'ready' ? view.release.version : undefined,
      downloadUrl: !isMod && view.state === 'ready' && view.installer !== undefined ? absolute(downloadPath(entry.id)) : undefined,
      screenshot: shareImage === undefined ? undefined : absolute(shareImage.src),
      sameAs: [`https://github.com/${data.repo}`, ...(isMod ? [data.modrinth, data.curseforge] : [])],
    }),
    breadcrumbJsonLd([
      { name: SITE_NAME, url: absolute(homePath) },
      { name: data.name, url: pageUrl },
    ]),
  ];

  return { view, downloads, title, shareImage, jsonLd };
};
