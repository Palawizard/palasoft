import { z } from 'zod';

export interface StoreClientOptions {
  apiUrl: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}

export class StoreRequestError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`Store request failed with status ${status}: ${url}`);
    this.name = 'StoreRequestError';
  }
}

const getJson = async (url: string, headers: Record<string, string>, options: StoreClientOptions): Promise<unknown> => {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(options.timeoutMs) });
  if (!response.ok) throw new StoreRequestError(url, response.status);
  return response.json();
};

const USER_AGENT = 'palasoft (https://palawi.fr/software)';

const modrinthProjectSchema = z.object({ downloads: z.number().int().nonnegative() });

export const modrinthSlug = (projectUrl: string): string | undefined => {
  const match = /^\/(?:mod|plugin|datapack)\/([\w-]+)\/?$/.exec(new URL(projectUrl).pathname);
  return match?.[1];
};

export const fetchModrinthDownloads = async (slug: string, options: StoreClientOptions): Promise<number> => {
  const url = `${options.apiUrl}/project/${encodeURIComponent(slug)}`;
  const project = modrinthProjectSchema.parse(await getJson(url, { 'User-Agent': USER_AGENT }, options));
  return project.downloads;
};

const curseForgeModSchema = z.object({ data: z.object({ downloadCount: z.number().nonnegative() }) });

export const fetchCurseForgeDownloads = async (
  projectId: number,
  apiKey: string,
  options: StoreClientOptions,
): Promise<number> => {
  const url = `${options.apiUrl}/v1/mods/${projectId}`;
  const mod = curseForgeModSchema.parse(
    await getJson(url, { Accept: 'application/json', 'x-api-key': apiKey }, options),
  );
  return Math.round(mod.data.downloadCount);
};
