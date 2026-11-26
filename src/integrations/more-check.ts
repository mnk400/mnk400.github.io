import type { AstroIntegration } from 'astro';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getMoreCategory } from '../data/categories.ts';
import { getMoreGroups, moreItems } from '../lib/more.ts';

// Fails the build when src/data/more/ and the built site disagree: an item
// with no page (its /more link and redirects would 404), a listed item with
// no description (its page would ship the site-wide meta description), or a
// group with no categories.ts entry (its label silently falls back to a slug).
export default function moreCheck(): AstroIntegration {
  return {
    name: 'more-check',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const problems: string[] = [];

        for (const item of moreItems) {
          if (/^https?:\/\//.test(item.url)) continue;
          const page = new URL(`.${item.url.replace(/\/?$/, '/')}index.html`, dir);
          if (!existsSync(fileURLToPath(page))) problems.push(`${item.id}: no page built at ${item.url}`);
          if (item.listed && !item.description) problems.push(`${item.id}: listed but has no description`);
        }

        for (const group of getMoreGroups()) {
          if (!getMoreCategory(group.path)) problems.push(`group "${group.path}": no entry in src/data/categories.ts`);
        }

        if (problems.length > 0) {
          throw new Error(`/more data is out of sync:\n  ${problems.join('\n  ')}`);
        }
        logger.info(`${moreItems.length} /more items have pages and descriptions`);
      },
    },
  };
}
