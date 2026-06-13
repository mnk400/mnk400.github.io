import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { cliToolProductItems } from './data/more/cli-tools.ts';
import type { ProductItemData } from './data/more/products.ts';
import { fetchReadmeMarkdown } from './lib/load-readme.ts';

const isBuild = process.env.npm_lifecycle_event === 'build';
const allowReadmeFallback = process.env.ALLOW_README_FALLBACK === 'true';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // date is optional in frontmatter — when absent, the route derives it
    // from the filename (YYYY-MM-DD-slug.md), matching Jekyll's behavior.
    date: z.coerce.date().optional(),
    edit: z.coerce.date().optional(),
    image: z.string().optional(),
    useMath: z.boolean().optional(),
  }),
});

// All products with kind:'readme' whose README should be baked at build time.
// Extend by importing additional family arrays here.
const readmeProducts: ProductItemData[] = [
  ...cliToolProductItems,
].filter((p) => p.kind === 'readme' && p.repo);

const readmes = defineCollection({
  loader: {
    name: 'product-readmes',
    load: async ({ store, renderMarkdown, parseData, logger }) => {
      store.clear();
      for (const product of readmeProducts) {
        let md = await fetchReadmeMarkdown(product);
        if (!md) {
          const message = `README fetch failed for ${product.id}`;
          if (isBuild && !allowReadmeFallback) {
            throw new Error(`${message}. Set ALLOW_README_FALLBACK=true only when intentionally building placeholder product pages.`);
          }
          logger.warn(`${message}; using local placeholder`);
          md = `Could not load README. [View it on GitHub](https://github.com/${product.repo}).`;
        }
        store.set({
          id: product.id,
          data: await parseData({ id: product.id, data: {} }),
          body: md,
          rendered: await renderMarkdown(md),
        });
      }
    },
  },
});

export const collections = { posts, readmes };
