export interface ServerConfig {
  githubApiUrl: string;
  githubToken: string | undefined;
  dataDir: string;
  requestTimeoutMs: number;
  cacheTtlMs: number;
}

type Env = Readonly<Record<string, string | undefined>>;

const nonEmpty = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === '' ? undefined : value.trim();

export const readConfig = (env: Env): ServerConfig => ({
  githubApiUrl: (nonEmpty(env['GITHUB_API_URL']) ?? 'https://api.github.com').replace(/\/+$/, ''),
  githubToken: nonEmpty(env['GITHUB_TOKEN']),
  dataDir: nonEmpty(env['DATA_DIR']) ?? './data',
  requestTimeoutMs: 5000,
  cacheTtlMs: 10 * 60 * 1000,
});
