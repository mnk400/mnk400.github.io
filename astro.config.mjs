import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import icon from 'astro-icon';

const sassLoadPaths = [
  fileURLToPath(new URL('./_sass', import.meta.url)),
];

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://astro.manik.cc',
  integrations: [icon()],
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
