# Architecture

## Layout

```
src/
  content.config.ts      schema of the software entries
  content/software/      one Markdown file per program (frontmatter + page text)
  pages/                 routes, served under /software
    api/health.ts        health check
    dl/[slug].ts         redirect to the recommended file
    dl/[slug]/[file].ts  redirect to a named file of the latest release
  layouts/               page shells
  components/            shared UI pieces
  server/                glue between Astro and lib/ (catalog instance, entry lookup, responses)
  lib/                   code that does not depend on Astro
    config.ts            environment variables
    github.ts            GitHub releases client and response schema
    cache.ts             memory cache with a copy on disk
    assets.ts            file selection (Windows installer, mod jars)
    catalog.ts           release data of one program, ready for the pages
    format.ts            French formatting of sizes, dates and Minecraft versions
  styles/                global styles and design tokens
tests/                   unit tests
  fixtures/github/       real GitHub responses, reduced to the fields in use
  e2e/                   tests against the built server and a local fake GitHub
docs/                    project documentation
```

## Content model

Each file in `src/content/software/` describes one program. The file name is its slug, used in its URL. Two kinds exist:

- `windows`: a Windows program installed from a GitHub release. `installerPattern` is a regular expression matched against the file names of the release: the first match is the file offered for download. `unsignedInstaller` says whether Windows SmartScreen shows a warning, `requirements` lists what must be installed first.
- `minecraft-mod`: a Minecraft mod, also published on Modrinth and CurseForge. `versionMatrix` is the path, in the mod repository, of the JSON file that lists the Minecraft version bands and their loaders. It is read at the tag of the latest release.

Every entry has a display name, a one-line tagline in French, a sort order and its GitHub repository (`Palawizard/<repo>`).

The build fails when an entry has no file selection rule (`installerPattern` or `versionMatrix`).

## Release data

For each program the server fetches the list of releases (`GET /repos/<repo>/releases`) and, for a mod, the version matrix at the latest tag. The latest release is the most recent published one that is not a draft. A release counts as a beta when GitHub flags it as a prerelease or when its tag contains `-alpha`, `-beta`, `-rc` or `-pre`.

The answer is kept in memory for 10 minutes and saved to `DATA_DIR/software-<slug>.json`. When GitHub fails or takes longer than 5 seconds, the server uses the copy in memory, then the copy on disk, and waits one minute before asking GitHub again. Without any copy, the pages show the program without its release details.

Mod jars are named `<artifact>-<version>.jar`, where `artifact` comes from the matrix and `version` is the tag without its leading `v`. Only the jars present in the release are offered.

## Downloads

Files are never served by this site. `/software/dl/<slug>` answers `302` to the GitHub download URL of the recommended installer, and `/software/dl/<slug>/<file>` to a file of the latest release, checked against its file list (`404` otherwise). The mod has no single recommended file: its short link leads to its page. When GitHub is down and nothing is saved, both routes send the visitor to the GitHub releases page of the program.

## Environment

| Variable | Use |
|---|---|
| `HOST`, `PORT` | address of the Node server |
| `GITHUB_TOKEN` | optional token, raises the GitHub API rate limit |
| `DATA_DIR` | folder for the saved copies (default `./data`) |
| `GITHUB_API_URL` | GitHub API base URL (default `https://api.github.com`), pointed at a local fake by the end-to-end tests |

## Pages

Every program gets a generic page built from the shared components. A program can have its own page instead by adding `src/pages/<slug>.astro`: a static route takes priority over the dynamic one, and the custom page still uses the shared layout so the site keeps one look.

## Base path

The site lives behind the palawi.fr gateway under `/software`, without prefix rewriting. `base` in `astro.config.mjs` and the gateway route must stay in sync.
