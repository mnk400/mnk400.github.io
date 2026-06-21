import type { AstroIntegration } from 'astro';
import { copyFile, writeFile } from 'node:fs/promises';
import { getMoreRedirects } from '../lib/more.ts';

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

export default function redirects(): AstroIntegration {
  return {
    name: 'redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const rules = getMoreRedirects().flatMap(({ from, to }) => [
          `${from} ${withTrailingSlash(to)} 301`,
          `${withTrailingSlash(from)} ${withTrailingSlash(to)} 301`,
        ]);

        await writeFile(new URL('_redirects', dir), `${rules.join('\n')}\n`);
        logger.info(`wrote ${rules.length} redirect rule(s) to _redirects`);

        await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir));
        logger.info('wrote sitemap.xml compatibility alias');
      },
    },
  };
}
