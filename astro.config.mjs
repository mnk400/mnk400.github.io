import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const sassLoadPaths = [
  fileURLToPath(new URL('./_sass', import.meta.url)),
];

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://astro.manik.cc',
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: sassLoadPaths,
          quietDeps: true,
          silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'mixed-decls'],
        },
      },
    },
  },
});
