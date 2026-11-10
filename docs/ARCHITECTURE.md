# Architecture

## Layout

```
src/
  content.config.ts      schema of the software entries
  content/software/      one Markdown file per program (frontmatter + page text)
  pages/                 routes, served under /software
    api/health.ts        health check
  layouts/               page shells
  components/            shared UI pieces
  lib/                   code that does not depend on Astro (GitHub client, asset matching)
  styles/                global styles and design tokens
tests/                   Vitest tests and their recorded fixtures
docs/                    project documentation
```

## Content model

Each file in `src/content/software/` describes one program. The file name is its slug, used in its URL. Two kinds exist:

- `windows`: a Windows program installed from a GitHub release. `unsignedInstaller` says whether Windows SmartScreen shows a warning, `requirements` lists what must be installed first.
- `minecraft-mod`: a Minecraft mod, also published on Modrinth and CurseForge.

Every entry has a display name, a one-line tagline in French, a sort order and its GitHub repository (`Palawizard/<repo>`).

## Pages

Every program gets a generic page built from the shared components. A program can have its own page instead by adding `src/pages/<slug>.astro`: a static route takes priority over the dynamic one, and the custom page still uses the shared layout so the site keeps one look.

## Base path

The site lives behind the palawi.fr gateway under `/software`, without prefix rewriting. `base` in `astro.config.mjs` and the gateway route must stay in sync.
