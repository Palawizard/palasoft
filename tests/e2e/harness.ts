import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { readFixture, releasesFixture } from '../helpers/fixtures.ts';

const entryPoint = fileURLToPath(new URL('../../dist/server/entry.mjs', import.meta.url));

export interface FakeGitHub {
  url: string;
  down: boolean;
  withoutReleases: Set<string>;
  requests: string[];
  close: () => Promise<void>;
}

const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

const fixtureFor = (path: string, ref: string | null, withoutReleases: Set<string>): unknown => {
  const releases = /^\/repos\/(Palawizard\/[^/]+)\/releases$/.exec(path);
  if (releases?.[1] !== undefined) return withoutReleases.has(releases[1]) ? [] : releasesFixture(releases[1]);
  if (path === '/repos/Palawizard/PalasItemClear/contents/versions/version-matrix.json' && ref === 'v0.1.2') {
    return readFixture('github/palasitemclear-version-matrix-v0.1.2.json');
  }
  if (path === '/modrinth/v2/project/palas-item-clear') return readFixture('modrinth/project-palas-item-clear.json');
  return undefined;
};

export const startFakeGitHub = async (): Promise<FakeGitHub> => {
  const fake: Omit<FakeGitHub, 'url' | 'close'> = { down: false, withoutReleases: new Set(), requests: [] };
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake.test');
    fake.requests.push(url.pathname);
    const body = fake.down ? undefined : fixtureFor(url.pathname, url.searchParams.get('ref'), fake.withoutReleases);
    response.writeHead(fake.down ? 503 : body === undefined ? 404 : 200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body ?? { message: fake.down ? 'Service Unavailable' : 'Not Found' }));
  });
  const port = await listen(server);
  return Object.assign(fake, { url: `http://127.0.0.1:${port}`, close: () => closeServer(server) });
};

const freePort = async (): Promise<number> => {
  const probe = createServer();
  const port = await listen(probe);
  await closeServer(probe);
  return port;
};

export interface Site {
  url: string;
  output: () => string;
  stop: () => Promise<void>;
}

const hasExited = (child: ChildProcess): boolean => child.exitCode !== null || child.signalCode !== null;

const waitUntilReady = async (url: string, child: ChildProcess): Promise<void> => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (hasExited(child)) throw new Error(`site exited with code ${child.exitCode}`);
    try {
      if ((await fetch(`${url}/software/api/health`)).ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('site did not start within 15 s');
};

export const startSite = async (env: Record<string, string>): Promise<Site> => {
  if (!existsSync(entryPoint)) throw new Error('dist/server/entry.mjs is missing: run npm run build first');
  const port = await freePort();
  let output = '';
  const child = spawn(process.execPath, [entryPoint], {
    env: {
      PATH: process.env['PATH'] ?? '',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      ...(env['GITHUB_API_URL'] === undefined
        ? {}
        : {
            MODRINTH_API_URL: `${env['GITHUB_API_URL']}/modrinth/v2`,
            CURSEFORGE_API_URL: `${env['GITHUB_API_URL']}/curseforge`,
          }),
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const url = `http://127.0.0.1:${port}`;
  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      if (hasExited(child)) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
    });
  try {
    await waitUntilReady(url, child);
  } catch (error) {
    await stop();
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${output}`);
  }
  return { url, output: () => output, stop };
};

export const get = (site: Site, path: string): Promise<Response> =>
  fetch(`${site.url}${path}`, { redirect: 'manual' });
