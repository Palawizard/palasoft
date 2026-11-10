import { readFileSync } from 'node:fs';

export const readFixture = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../fixtures/${path}`, import.meta.url), 'utf8'));

export const releasesFixture = (repo: string): unknown =>
  readFixture(`github/${repo.split('/')[1]?.toLowerCase()}-releases.json`);

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
