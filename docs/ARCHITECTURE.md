# Architecture

## Layout

```
src/
  content.config.ts      schema of the software entries
  content/software/      one Markdown file per program (frontmatter + page text)
  pages/                 routes, served under /software
    index.astro          home: quick download strip, then one tile per program
    [slug].astro         generic program page
    404.astro            not found page
    api/health.ts        health check
    dl/[slug].astro      redirect to the recommended file (or the mod jar chosen in the form)
    dl/[slug]/[file].astro  redirect to a named file of the latest release
  layouts/Layout.astro   shared page shell: glass header, footer, font, sky and water scene
  components/            shared UI pieces (quick download dock, showcase window, bubbles,
                         software rows, download button, mod picker, screenshot gallery,
                         SmartScreen help...)
  assets/software/<slug>/  icon and screenshots of each program, optimised by Astro at build
  server/                glue between Astro and lib/ (catalog instance, entry lookup, responses)
  lib/                   code that does not depend on Astro
    config.ts            environment variables
    github.ts            GitHub releases client and response schema
    cache.ts             memory cache with a copy on disk
    assets.ts            file selection (Windows installer, mod jars)
    catalog.ts           release data of one program, ready for the pages
    counts.ts            GitHub download count, without update manifests, signatures and checksums
    stores.ts            Modrinth and CurseForge download counts
    format.ts            French formatting of sizes, dates, counts and Minecraft versions
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

Every entry has a display name, a one-line tagline in French, a sort order, its GitHub repository (`Palawizard/<repo>`), a colour (`crimson`, `magenta`, `cobalt`, `teal`, `violet`, `emerald`, used as the tint of its bubble and window), an `icon` and a list of `screenshots` (`src` and `alt`), both paths into `src/assets/software/<slug>/` checked at build time. The first screenshot is the one shown next to the download button and in the home lists; the others form the gallery of the program page. The Markdown body of the file is the text of the program page. `requirements` is shown in the "Ce qu'il te faut" block next to the text.

Icons come from each program's repository at its published tag. Screenshots of PalaClips and Pala's Item Clear come from their repositories; the other four were captured from each program's own interface, run in a browser with example data. Each image file carries its origin in its metadata.

The build fails when an entry has no file selection rule (`installerPattern` or `versionMatrix`).

## Release data

For each program the server fetches the list of releases (`GET /repos/<repo>/releases`) and, for a mod, the version matrix at the latest tag. The latest release is the most recent published one that is not a draft. A release counts as a beta when GitHub flags it as a prerelease or when its tag contains `-alpha`, `-beta`, `-rc` or `-pre`.

The answer is kept in memory for 10 minutes and saved to `DATA_DIR/software-<slug>.json`. When GitHub fails or takes longer than 5 seconds, the server uses the copy in memory, then the copy on disk, and waits one minute before asking GitHub again. Without any copy, the pages show the program without its release details.

Mod jars are named `<artifact>-<version>.jar`, where `artifact` comes from the matrix and `version` is the tag without its leading `v`. Only the jars present in the release are offered.

## Download counts

The count shown for a program is the sum of the `download_count` of its GitHub files, over every published release (the client follows the `Link` pagination of the releases list, up to 10 pages, on the API host only). Update manifests (`latest.json`, `latest.yml`), signatures (`.sig`), `.blockmap` files and checksum files are never counted: the auto-updaters fetch them on every start. For the mod, the Modrinth project `downloads` is added (slug read from the `modrinth` link of the entry), and the CurseForge `downloadCount` only when `CURSEFORGE_API_KEY` is set and the entry has a `curseforgeId`. Store counts use the same cache and saved copies as the releases (`DATA_DIR/modrinth-<slug>.json`, `DATA_DIR/curseforge-<id>.json`); a store that fails is left out of the sum without any message. Without release data, no count is shown.

## Downloads

Files are never served by this site. `/software/dl/<slug>` answers `302` to the GitHub download URL of the recommended installer, and `/software/dl/<slug>/<file>` to a file of the latest release, checked against its file list (`404` otherwise). The mod has no single recommended file: its short link leads to its page. When GitHub is down and nothing is saved, both routes send the visitor to the GitHub releases page of the program.

## Environment

| Variable | Use |
|---|---|
| `HOST`, `PORT` | address of the Node server |
| `GITHUB_TOKEN` | optional token, raises the GitHub API rate limit |
| `DATA_DIR` | folder for the saved copies (default `./data`) |
| `CURSEFORGE_API_KEY` | optional CurseForge API key; without it CurseForge is never called |
| `GITHUB_API_URL` | GitHub API base URL (default `https://api.github.com`), pointed at a local fake by the end-to-end tests |
| `MODRINTH_API_URL` | Modrinth API base URL (default `https://api.modrinth.com/v2`), same use |
| `CURSEFORGE_API_URL` | CurseForge API base URL (default `https://api.curseforge.com`), same use |

## Pages

Every program gets a generic page built from the shared components. A program can have its own page instead by adding `src/pages/<slug>.astro`: a static route takes priority over the dynamic one, and the custom page still uses the shared layout so the site keeps one look. This was checked on a build with a temporary `src/pages/timestamper.astro`: `/software/timestamper` served the custom page while `/software/palaclips` kept the generic one.

The download routes are Astro pages without markup rather than endpoints, so that a `404` without body renders `404.astro`. The mod page posts a plain HTML form (`loader` plus `mc-<loader>`) to `/software/dl/<slug>`, which redirects to the matching jar; it works without JavaScript.

When GitHub is down, every page still renders: with a saved copy it shows the saved release details and the date of that copy, without one it shows the programs without release details and the buttons lead to GitHub.

## Base path

The site lives behind the palawi.fr gateway under `/software`, without prefix rewriting. `base` in `astro.config.mjs` and the gateway route must stay in sync.
