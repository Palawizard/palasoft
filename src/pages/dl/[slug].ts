import type { APIRoute } from 'astro';
import { catalog, findSoftware, notFound, redirect, softwarePath, toSource } from '../../server/software.ts';

export const GET: APIRoute = async ({ params }) => {
  const entry = await findSoftware(params.slug);
  if (entry === undefined) return notFound();
  if (entry.data.kind !== 'windows') return redirect(softwarePath(entry.id));

  const view = await catalog.release(toSource(entry));
  switch (view.state) {
    case 'unavailable':
      return redirect(`${view.historyUrl}/latest`);
    case 'none':
      return redirect(softwarePath(entry.id));
    case 'ready':
      return redirect(view.installer?.browser_download_url ?? view.release.pageUrl);
  }
};
