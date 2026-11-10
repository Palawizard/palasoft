import type { Release } from './github.ts';

const NOT_A_DOWNLOAD = /^latest\.(json|ya?ml)$|\.sig$|\.blockmap$|checksum|\.(sha256|sha512|md5)$|^sha\d+sums/i;

export const isCountedDownload = (fileName: string): boolean => !NOT_A_DOWNLOAD.test(fileName);

export const githubDownloads = (releases: readonly Release[]): number =>
  releases
    .filter((release) => !release.draft)
    .flatMap((release) => release.assets)
    .filter((asset) => isCountedDownload(asset.name))
    .reduce((total, asset) => total + asset.download_count, 0);
