# PalaSoft

Download site for the software I publish: one page per program, a direct download button and installation help written for people who never use GitHub, in French and in English. Served at [palawi.fr/software](https://palawi.fr/software).

Files are not hosted here. The server reads the GitHub releases of each program and sends the visitor to the right file.

## Stack

Astro (server output, Node adapter), TypeScript in strict mode, Vitest.

## Getting started

Requires Node 22.23.4 or newer.

```sh
npm install
cp .env.example .env
npm run dev
```

The site is served under the `/software` base path, so open `http://localhost:4321/software/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run check` | Type and content checks |
| `npm test` | Unit tests |
| `npm run build` | Checks, then production build in `dist/` |
| `npm run test:e2e` | End-to-end tests against the build in `dist/` (run `npm run build` first) |
| `npm start` | Runs the production build |

Health check: `GET /software/api/health`. Download links: `/software/dl/<slug>` for the recommended file, `/software/dl/<slug>/<file>` for a given file of the latest release.

## Docker

The image is built in two stages (dependencies and build, then a runtime with production dependencies only) and runs as the unprivileged `node` user. Its health check calls `/software/api/health`.

`compose.yaml` runs one container, `palasoft-web`:

- no published port: a reverse proxy reaches it on port 4321 through an external Docker network, `palasoft-edge` by default (set `PALASOFT_NETWORK` to use another one);
- read-only root file system, all capabilities dropped;
- the saved copies of the remote data live in the `palasoft-data` volume, mounted on `DATA_DIR` (`/app/data`);
- settings come from `.env` when it exists (see `.env.example`).

```sh
docker network create palasoft-edge
cp .env.example .env
docker compose up -d --build
docker compose ps
```

The container is healthy once `docker compose ps` shows `(healthy)`.

## Adding a program

Add a Markdown file to `src/content/software/` and its English text, under the same name, to `src/content/software-en/`. Their frontmatter is validated at build time by the schema in `src/content.config.ts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
