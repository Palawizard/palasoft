import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const media = ({ image }: SchemaContext) => ({
  icon: image(),
  screenshots: z.array(z.object({ src: image(), alt: z.string().min(1) })).default([]),
});

const common = {
  name: z.string().min(1),
  tagline: z.string().min(1).max(140),
  order: z.number().int().nonnegative(),
  repo: z.string().regex(/^Palawizard\/[\w.-]+$/),
  color: z.enum(['crimson', 'magenta', 'cobalt', 'teal', 'violet', 'emerald', 'amber']),
  // The program carries a "new" badge until this date (midnight UTC).
  newUntil: z.date().optional(),
  // schema.org application category, for search engines.
  category: z.enum(['MultimediaApplication', 'UtilitiesApplication', 'DesktopEnhancementApplication', 'GameApplication']),
  // Languages of the program's own interface (for the mod, of its chat messages). The English site
  // marks the programs that have English.
  languages: z.array(z.enum(['fr', 'en'])).min(1),
};

const isValidRegExp = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

const windowsApp = (context: SchemaContext) =>
  z.object({
  ...common,
  ...media(context),
  kind: z.literal('windows'),
  installerPattern: z.string().min(1).refine(isValidRegExp, 'Must be a valid regular expression'),
  unsignedInstaller: z.boolean(),
  // A free program from another publisher that this one needs, offered next to the download button
  // and in the thank-you window (see src/server/dependencies.ts).
  companion: z.enum(['vb-cable']).optional(),
  requirements: z
    .array(z.object({ label: z.string().min(1), url: z.url().optional() }))
    .default([]),
});

const minecraftMod = (context: SchemaContext) =>
  z.object({
  ...common,
  ...media(context),
  kind: z.literal('minecraft-mod'),
  versionMatrix: z.string().regex(/^[\w./-]+\.json$/),
  modrinth: z.url(),
  curseforge: z.url(),
  curseforgeId: z.number().int().positive().optional(),
  // Mods the server also needs, downloaded from Modrinth for the chosen loader and Minecraft version.
  // `bands` limits a companion to some lines of the version matrix (all of them when absent).
  companions: z
    .array(
      z.object({
        name: z.string().min(1),
        modrinth: z.string().regex(/^[\w-]+$/),
        loaders: z.array(z.string().min(1)).min(1),
        bands: z.array(z.string().min(1)).optional(),
      }),
    )
    .default([]),
});

const software = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/software' }),
  schema: (context) => z.discriminatedUnion('kind', [windowsApp(context), minecraftMod(context)]),
});

// English text of a program: same slug as its French file, the rest of its data comes from the French file.
// `screenshotAlts` and `requirements` follow the order of the French lists.
const softwareEn = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/software-en' }),
  schema: z.object({
    tagline: z.string().min(1).max(140),
    screenshotAlts: z.array(z.string().min(1)).default([]),
    requirements: z.array(z.string().min(1)).default([]),
  }),
});

export const collections = { software, softwareEn };
