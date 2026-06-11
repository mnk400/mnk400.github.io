import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import ogImages from './src/integrations/og-images.ts';

const sassLoadPaths = [
  fileURLToPath(new URL('./_sass', import.meta.url)),
];

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://fuckmanik.com',
  integrations: [
    icon(),
    sitemap({
      // /more/<slug>/ pages are 301 redirects to canonical URLs; keep /more/ itself.
      filter: (page) => !/\/more\/[^/]+\/$/.test(page),
    }),
    ogImages(),
  ],
  markdown: {
    // Shiki emits both --shiki-light and --shiki-dark on each token so our
    // [data-theme] CSS can pick which one to render. See _sass/components/_code.scss.
    shikiConfig: {
      themes: { light: 'min-light', dark: 'min-dark' },
      defaultColor: false,
    },
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: sassLoadPaths,
          quietDeps: true,
          silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
        },
      },
    },
  },
});
