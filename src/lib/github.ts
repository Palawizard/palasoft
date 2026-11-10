import { z } from 'zod';

export const assetSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().nonnegative(),
  download_count: z.number().int().nonnegative(),
  browser_download_url: z.url(),
  content_type: z.string(),
});

export const releaseSchema = z.object({
  tag_name: z.string().min(1),
  name: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  html_url: z.url(),
  assets: z.array(assetSchema),
});

export const releasesSchema = z.array(releaseSchema);

export type Asset = z.infer<typeof assetSchema>;
export type Release = z.infer<typeof releaseSchema>;

export interface GitHubClientOptions {
  apiUrl: string;
  token: string | undefined;
  timeoutMs: number;
  fetch?: typeof fetch;
}

export class GitHubRequestError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`GitHub request failed with status ${status}: ${url}`);
    this.name = 'GitHubRequestError';
  }
}

const headers = (token: string | undefined, accept: string): Record<string, string> => ({
  Accept: accept,
  'User-Agent': 'palasoft',
  ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
});

const request = async (url: string, accept: string, options: GitHubClientOptions): Promise<Response> => {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(url, {
    headers: headers(options.token, accept),
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  if (!response.ok) {
    throw new GitHubRequestError(url, response.status);
  }
  return response;
};

const getJson = async (url: string, accept: string, options: GitHubClientOptions): Promise<unknown> =>
  (await request(url, accept, options)).json();

const MAX_RELEASE_PAGES = 10;

export const nextPageUrl = (link: string | null, apiUrl: string): string | undefined => {
  const next = link
    ?.split(',')
    .map((part) => /<([^>]+)>;\s*rel="([^"]+)"/.exec(part.trim()))
    .find((match) => match?.[2] === 'next')?.[1];
  if (next === undefined) return undefined;
  return new URL(next).origin === new URL(apiUrl).origin ? next : undefined;
};

export const fetchReleases = async (
  repo: string,
  options: GitHubClientOptions,
): Promise<Release[]> => {
  const releases: Release[] = [];
  let url: string | undefined = `${options.apiUrl}/repos/${repo}/releases?per_page=100`;
  for (let page = 0; url !== undefined && page < MAX_RELEASE_PAGES; page += 1) {
    const response: Response = await request(url, 'application/vnd.github+json', options);
    releases.push(...releasesSchema.parse(await response.json()));
    url = nextPageUrl(response.headers.get('link'), options.apiUrl);
  }
  return releases;
};

export const fetchRepoJsonFile = async (
  repo: string,
  ref: string,
  path: string,
  options: GitHubClientOptions,
): Promise<unknown> => {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${options.apiUrl}/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
  return getJson(url, 'application/vnd.github.raw+json', options);
};

const publishedTime = (release: Release): number =>
  release.published_at === null ? 0 : Date.parse(release.published_at);

export const latestRelease = (releases: readonly Release[]): Release | undefined =>
  releases
    .filter((release) => !release.draft)
    .toSorted((a, b) => publishedTime(b) - publishedTime(a))[0];

const BETA_TAG = /-(alpha|beta|rc|pre)\b/i;

export const isBeta = (release: Release): boolean =>
  release.prerelease || BETA_TAG.test(release.tag_name);

export const versionLabel = (release: Release): string => release.tag_name.replace(/^v/i, '');
