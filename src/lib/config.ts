export interface ServerConfig {
  githubApiUrl: string;
  githubToken: string | undefined;
  modrinthApiUrl: string;
  curseforgeApiUrl: string;
  curseforgeApiKey: string | undefined;
  vbCablePageUrl: string;
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
  modrinthApiUrl: (nonEmpty(env['MODRINTH_API_URL']) ?? 'https://api.modrinth.com/v2').replace(/\/+$/, ''),
  curseforgeApiUrl: (nonEmpty(env['CURSEFORGE_API_URL']) ?? 'https://api.curseforge.com').replace(/\/+$/, ''),
  curseforgeApiKey: nonEmpty(env['CURSEFORGE_API_KEY']),
  vbCablePageUrl: nonEmpty(env['VB_CABLE_PAGE_URL']) ?? 'https://vb-audio.com/Cable/',
  dataDir: nonEmpty(env['DATA_DIR']) ?? './data',
  requestTimeoutMs: 5000,
  cacheTtlMs: 10 * 60 * 1000,
});
