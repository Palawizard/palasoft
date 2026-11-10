import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const common = {
  name: z.string().min(1),
  tagline: z.string().min(1).max(140),
  order: z.number().int().nonnegative(),
  repo: z.string().regex(/^Palawizard\/[\w.-]+$/),
  color: z.enum(['crimson', 'magenta', 'cobalt', 'teal', 'violet', 'emerald']),
};

const isValidRegExp = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

const windowsApp = z.object({
  ...common,
  kind: z.literal('windows'),
  installerPattern: z.string().min(1).refine(isValidRegExp, 'Must be a valid regular expression'),
  unsignedInstaller: z.boolean(),
  requirements: z
    .array(z.object({ label: z.string().min(1), url: z.url().optional() }))
    .default([]),
});

const minecraftMod = z.object({
  ...common,
  kind: z.literal('minecraft-mod'),
  versionMatrix: z.string().regex(/^[\w./-]+\.json$/),
  modrinth: z.url(),
  curseforge: z.url(),
});

const software = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/software' }),
  schema: z.discriminatedUnion('kind', [windowsApp, minecraftMod]),
});

export const collections = { software };
