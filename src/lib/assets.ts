import { z } from 'zod';
import { versionLabel, type Asset, type Release } from './github.ts';

export const pickInstaller = (release: Release, installerPattern: string): Asset | undefined => {
  const pattern = new RegExp(installerPattern);
  return release.assets.find((asset) => pattern.test(asset.name));
};

export const modMatrixSchema = z.object({
  bands: z.array(
    z.object({
      id: z.string().min(1),
      minecraftRange: z.string().min(1),
      loaders: z.record(z.string().min(1), z.object({ artifact: z.string().min(1) })),
    }),
  ),
});

export type ModMatrix = z.infer<typeof modMatrixSchema>;

export interface ModFile {
  loader: string;
  bandId: string;
  minecraftRange: string;
  asset: Asset;
}

export const modFiles = (release: Release, matrix: ModMatrix): ModFile[] => {
  const assetsByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const version = versionLabel(release);
  return matrix.bands.flatMap((band) =>
    Object.entries(band.loaders).flatMap(([loader, { artifact }]) => {
      const asset = assetsByName.get(`${artifact}-${version}.jar`);
      return asset === undefined
        ? []
        : [{ loader, bandId: band.id, minecraftRange: band.minecraftRange, asset }];
    }),
  );
};

export const findModFile = (
  files: readonly ModFile[],
  loader: string,
  bandId: string,
): ModFile | undefined => files.find((file) => file.loader === loader && file.bandId === bandId);

export const findAsset = (assets: readonly Asset[], name: string): Asset | undefined =>
  assets.find((asset) => asset.name === name);

export interface LoaderFiles {
  loader: string;
  files: ModFile[];
}

export const filesByLoader = (files: readonly ModFile[]): LoaderFiles[] => {
  const groups = new Map<string, ModFile[]>();
  for (const file of files) {
    groups.set(file.loader, [...(groups.get(file.loader) ?? []), file]);
  }
  return [...groups]
    .map(([loader, group]) => ({ loader, files: group.toReversed() }))
    .toSorted((a, b) => a.loader.localeCompare(b.loader));
};
