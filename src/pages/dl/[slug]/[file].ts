import type { APIRoute } from 'astro';
import { findAsset } from '../../../lib/assets.ts';
import { catalog, findSoftware, notFound, redirect, toSource } from '../../../server/software.ts';

export const GET: APIRoute = async ({ params }) => {
  const entry = await findSoftware(params.slug);
  if (entry === undefined || params.file === undefined) return notFound();

  const view = await catalog.release(toSource(entry));
  switch (view.state) {
    case 'unavailable':
      return redirect(`${view.historyUrl}/latest`);
    case 'none':
      return notFound();
    case 'ready': {
      const asset = findAsset(view.release.assets, params.file);
      return asset === undefined ? notFound() : redirect(asset.browser_download_url);
    }
  }
};
