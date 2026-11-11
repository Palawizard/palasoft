# Architecture

## Layout

```
src/
  content.config.ts      schema of the software entries and of their English texts
  content/software/      one Markdown file per program (frontmatter + French page text)
  content/software-en/   the English text of each program, same file name
  middleware.ts          language of each request, redirect to the visitor's language
  env.d.ts               Astro.locals: locale and page path without language prefix
  i18n/                  fr.ts and en.ts (every interface string), index.ts (language of a page, its strings)
  pages/                 routes, served under /software; the en/ folder repeats the page routes in English
    index.astro, en/index.astro  home (views/HomePage.astro)
    [slug].astro, en/[slug].astro  generic program page (views/ProgramPage.astro)
    chest-counter.astro, en/chest-counter.astro  Chest Counter's own page (views/ChestCounterPage.astro, sections in components/chest-counter/)
    404.astro            not found page (noindex), in the language of the address
    lang/[locale].ts     the language switch: saves the choice in a cookie, back to the page
    sitemap.xml.ts       sitemap of every page in both languages with their hreflang links, listed in the robots.txt of palawi.fr
    api/health.ts        health check
    dl/[slug].astro      redirect to the recommended file (or the mod jar chosen in the form)
    dl/[slug]/[file].astro  redirect to a named file of the latest release
  views/                 the pages themselves, shared by the French and English routes
  layouts/Layout.astro   shared page shell: glass header (back to palawi.fr, wordmark, links, language switch), footer, font, sky and water scene, hreflang links
  components/            shared UI pieces (quick download dock, showcase window, bubbles,
                         software rows, download button, mod picker, screenshot gallery,
                         SmartScreen help, language switch...)
  assets/software/<slug>/  icon and screenshots of each program, optimised by Astro at build
public/                  PalaSoft site icons (favicon.svg, apple-touch-icon.png) and the share card (og-palasoft.jpg); the same logo is inlined in the header by components/Logo.astro
scripts/og-card/card.html  source of og-palasoft.jpg
  server/                glue between Astro and lib/ (catalog instance, entry lookup, localized paths and texts, responses,
                         program-page.ts: release, title, share picture and structured data of a program page,
                         dependencies.ts: cached links to VB-CABLE and companion mods)
  lib/                   code that does not depend on Astro
    config.ts            environment variables
    locale.ts            the two languages, Accept-Language reading, cookie name
    github.ts            GitHub releases client and response schema
    cache.ts             memory cache with a copy on disk
    assets.ts            file selection (Windows installer, mod jars)
    catalog.ts           release data of one program, ready for the pages
    counts.ts            GitHub download count, without update manifests, signatures and checksums
    stores.ts            Modrinth and CurseForge download counts
    dependencies.ts      links to what a program needs: newest VB-CABLE package, Minecraft releases of a band, companion mod files on Modrinth
    format.ts            French and English formatting of sizes, dates, counts and Minecraft versions
    seo.ts               schema.org structured data (program, breadcrumb, site and program list)
  styles/                global styles and design tokens
tests/                   unit tests (translations.test.ts checks that both languages have the same strings and the same shape of program texts)
  fixtures/github/       real GitHub responses, reduced to the fields in use
  e2e/                   tests against the built server and a local fake GitHub
docs/                    project documentation
```

## Content model

Each file in `src/content/software/` describes one program. The file name is its slug, used in its URL. Two kinds exist:

- `windows`: a Windows program installed from a GitHub release. `installerPattern` is a regular expression matched against the file names of the release: the first match is the file offered for download. `unsignedInstaller` says whether Windows SmartScreen shows a warning, `requirements` lists what must be installed first. `companion` (only `vb-cable` for now) names a free program from another publisher that it needs, offered with a download button (see Dependencies).
- `minecraft-mod`: a Minecraft mod, also published on Modrinth and CurseForge. `versionMatrix` is the path, in the mod repository, of the JSON file that lists the Minecraft version bands and their loaders. It is read at the tag of the latest release. `companions` lists the mods the server also needs (`name`, Modrinth project slug, `loaders`, and `bands` to limit it to some lines of the matrix): Fabric API for every Fabric line, Architectury API for Forge and Fabric 1.20.1, as in the mod's `docs/SUPPORT.md`.

Every entry has a display name, a one-line tagline in French (also the meta description of its page), a sort order, its schema.org `category` (`MultimediaApplication`, `UtilitiesApplication`, `DesktopEnhancementApplication` or `GameApplication`, for search engines), its GitHub repository (`Palawizard/<repo>`), a colour (`crimson`, `magenta`, `cobalt`, `teal`, `violet`, `emerald`, `amber`, used as the tint of its bubble and window), an optional `newUntil` date (a « Nouveau » badge next to its name in the dock, the showcase and its page until that date, midnight UTC; pages render on each request so it goes away on its own), `languages`, the languages of its own interface (`fr`, `en`; for the mod, of its chat messages), an `icon` and a list of `screenshots` (`src` and `alt`), both paths into `src/assets/software/<slug>/` checked at build time. The first screenshot is the one shown next to the download button and in the home lists; the others form the gallery of the program page. The Markdown body of the file is the text of the program page. `requirements` is shown in the "Ce qu'il te faut" block next to the text.

Icons come from each program's repository at its published tag. Screenshots of PalaClips and Pala's Item Clear come from their repositories; the other four were captured from each program's own interface, run in a browser with example data. Each image file carries its origin in its metadata.

The build fails when an entry has no file selection rule (`installerPattern` or `versionMatrix`).

The English text of a program is a file of the same name in `src/content/software-en/`: `tagline`, `screenshotAlts` and `requirements` in the same order as the French lists (links stay in the French file), and the page text. `localText` in `server/software.ts` merges it with the French entry; without an English file the French text is shown.

## Release data

For each program the server fetches the list of releases (`GET /repos/<repo>/releases`) and, for a mod, the version matrix at the latest tag. The latest release is the most recent published one that is not a draft. A release counts as a beta when GitHub flags it as a prerelease or when its tag contains `-alpha`, `-beta`, `-rc` or `-pre`.

The answer is kept in memory for 10 minutes and saved to `DATA_DIR/software-<slug>.json`. When GitHub fails or takes longer than 5 seconds, the server uses the copy in memory, then the copy on disk, and waits one minute before asking GitHub again. Without any copy, the pages show the program without its release details.

Mod jars are named `<artifact>-<version>.jar`, where `artifact` comes from the matrix and `version` is the tag without its leading `v`. Only the jars present in the release are offered.

## Download counts

The count shown for a program is the sum of the `download_count` of its GitHub files, over every published release (the client follows the `Link` pagination of the releases list, up to 10 pages, on the API host only). Update manifests (`latest.json`, `latest.yml`, Velopack's `RELEASES` and `releases.<channel>.json`), signatures (`.sig`), `.blockmap` files and checksum files are never counted: the auto-updaters fetch them on every start. For the mod, the Modrinth project `downloads` is added (slug read from the `modrinth` link of the entry), and the CurseForge `downloadCount` only when `CURSEFORGE_API_KEY` is set and the entry has a `curseforgeId`. Store counts use the same cache and saved copies as the releases (`DATA_DIR/modrinth-<slug>.json`, `DATA_DIR/curseforge-<id>.json`); a store that fails is left out of the sum without any message. Without release data, no count is shown.

## Dependencies

What a program needs next to it is offered with a direct download, from its publisher's servers (never served by PalaSoft). `server/dependencies.ts` resolves the links and caches them for 6 hours, with a copy on disk like the releases (`DATA_DIR/vb-cable.json`, `DATA_DIR/modrinth-minecraft-releases.json`, `DATA_DIR/modrinth-<project>-<loader>-<band>.json`); when a source does not answer, the last copy is used, then a fallback.

- VB-CABLE: the newest `VBCABLE_Driver_Pack<n>.zip` linked on `https://vb-audio.com/Cable/` (the page also links an old package). Fallback: Pack46, the package linked on 2026-11-11 (VB-Audio keeps old packages online). `components/CompanionProgram.astro` shows it under the download button of the program page (button, file name, « gratuit (donationware) », link to VB-Audio's site), and, with its install steps (unzip first, `VBCABLE_Setup_x64` as administrator, Install Driver, restart: from the package readme and VB-Audio's forum), in the thank-you window of every download of the program, the quick download dock included (`data-thanks-companion` on the link, a `<template>` per program in the window).
- Companion mods: the Minecraft releases of each line are the Modrinth releases (no snapshots) inside the line's `minecraftRange` (Maven range); for each one, the newest stable file of the project for that loader. One release: a « Télécharger <mod> » button; several: one button per release (`components/CompanionMods.astro`), releases sharing a file grouped. Releases without a file (Modrinth down, file not published yet) get a link to the project's versions page on Modrinth. The mod picker shows the block of the current loader and line under its button; when the form is sent, the thank-you window shows a copy of it.

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
| `VB_CABLE_PAGE_URL` | page read to find the newest VB-CABLE package (default `https://vb-audio.com/Cable/`), same use |

## Pages

Every program gets a generic page built from the shared components. A program can have its own page instead by adding a view in `src/views/` and the two routes `src/pages/<slug>.astro` and `src/pages/en/<slug>.astro`: a static route takes priority over the dynamic one, and the custom page still uses the shared layout so the site keeps one look, and takes its release data, title, share picture and structured data from `programPage` (`server/program-page.ts`), like the generic page. Chest Counter has one (`views/ChestCounterPage.astro`): its two window captures side by side in light and dark (the site's theme decides which one is in front), how its total is built, first steps, a comparison with the other ways to count chests, then its text and the usual side column. This was checked on a build with a temporary `src/pages/timestamper.astro`: `/software/timestamper` served the custom page while `/software/palaclips` kept the generic one.

Thank-you window: `components/DownloadThanks.astro`, in the layout, is a modal `<dialog>` opened right after a click on a link marked `data-thanks` (download buttons and quick download dock, attributes from `thanksAttributes` in `server/software.ts`) or the submit of the mod form. The browser still follows the link or sends the form, the file downloads and the page stays. The window thanks the visitor, names the file, then shows the SmartScreen steps (`SmartScreenSteps.astro`, shared with the program page) for an unsigned installer, or the mod install steps. It has a link to start the download again and closes with its button, Escape or a click outside, focus going back to the button that started it. Links that lead to a page instead (GitHub down, release without installer) have no `data-thanks`. Modified clicks (new tab) do not open it.

The download routes are Astro pages without markup rather than endpoints, so that a `404` without body renders `404.astro`. The mod page posts a plain HTML form (`loader` plus `mc-<loader>`) to `/software/dl/<slug>`, which redirects to the matching jar; it works without JavaScript.

On the home page, the other programs alternate between two row layouts, capture on the right then on the left; a program whose first capture is taller than wide gets the compact row.

Theme: `<html data-theme="light|dark">` drives every dark rule (`:root[data-theme='dark'] ...`). An inline script in the head sets it before the first paint, from the visitor's saved choice (`localStorage` key `palasoft-theme`) or else the system setting. `components/SkyToggle.astro` is a button over the sun of the scene: it saves the other theme and, with the View Transitions API, reveals it as a circle growing from the sun (700 ms); without that API or under reduced motion the theme switches at once. The sun position is shared through `--sun-size`, `--sun-x` and `--sun-y` so the button, the sun and the lens flares stay aligned.

Motion: only the bubbles drift. The quick download dock and the featured window use `glass-still`, a glass panel without backdrop blur: they sit on the plain sky next to the drifting bubbles, where the blur is invisible but was recomputed on every frame and made the drift stutter. The sun rays are still for the same reason. The drift is a float and a sway: 2rem up while turning from -6 to 6 degrees, 4.5 s each way, the program bubbles turning around the centre of their sphere with their label. Firefox snaps a slow translation to whole pixels, so the earlier drift (0.6rem in 5 s, about 2 px a second) moved in visible steps on a 147 Hz screen, even with a 0.01 degree rotation; Palawi picked this motion among twelve variants side by side in Firefox. The mobile row of bubbles has 2.5rem of top padding because a scrolling row also clips what rises above it.

Search and sharing: every page has a canonical URL and its two language versions (the 404 page has `noindex` instead), Open Graph and Twitter tags, and one JSON-LD graph: `WebSite` and the `ItemList` of program pages on the home, `SoftwareApplication` (free offer, version, download URL, GitHub and store links, author `https://palawi.fr/#palawi` as declared on the palawi.fr hub) and `BreadcrumbList` on a program page. The picture of a shared link (Discord, social networks) is the first screenshot when it is wider than tall, served by `/_image` as a JPEG of 1200 px at most, never enlarged; otherwise `public/og-palasoft.jpg`, a 1200 by 630 card rendered from `scripts/og-card/card.html` (open it in Chrome at 1200 by 630 from that folder and capture it, after an `npm install`; redo it when a program is added or its icon changes, and raise the `?v=` of its URL in `layouts/Layout.astro` so Discord and Cloudflare fetch the new one). Discord takes the embed colour from `theme-color` (#0b4fa3 in the served HTML). Program page titles read "Télécharger <name> pour Windows | PalaSoft" ("Download <name> for Windows | PalaSoft" in English), the mod "<name>, mod Minecraft gratuit | PalaSoft" ("<name>, free Minecraft mod | PalaSoft").

When GitHub is down, every page still renders: with a saved copy it shows the saved release details and the date of that copy, without one it shows the programs without release details and the buttons lead to GitHub.

## Languages

The site is in French and in English. French pages keep their addresses (`/software/...`), English pages live under `/software/en/...`, so each language has its own address for search engines and for shared links. Every page links to both versions with `hreflang` (`x-default` is the French one), and the sitemap lists both.

`middleware.ts` reads the language from the address and puts it in `Astro.locals`. On a French address, a visitor without a saved choice whose browser asks for English, or for another language before French, is sent to the English page with a 302 (`Vary: Accept-Language, Cookie`, not cached). A bare `*` or no `Accept-Language` at all, which is how search engine crawlers ask, gets the French page; an English address is never redirected by the browser language. The header switch (`components/LanguageSwitch.astro`) links to `/software/lang/<fr|en>?next=<page>`, which saves the choice in the `palasoft-lang` cookie (one year, path `/software/`) and goes back to the same page in that language; it works without JavaScript and only accepts a `next` inside `/software/`. A saved choice wins over the browser language on every address. The mod form sends `lang` so that its redirects come back to the page in the right language.

On the English site, a program whose `languages` include `en` carries an « Available in English » badge (`components/LanguageBadge.astro`) in the showcase, its home row and its page; the others carry « Only in French for now » at the same places, in the soft ink. The French site shows neither.

Every visible string lives in `src/i18n/fr.ts` and `src/i18n/en.ts` (same keys, checked by a unit test); dates, sizes and counts go through `lib/format.ts` with the page language. Screenshots stay the French captures.

## Base path

The site lives behind the palawi.fr gateway under `/software`, without prefix rewriting. `base` in `astro.config.mjs` and the gateway route must stay in sync.
