import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://palawi.fr',
  base: '/software',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});
