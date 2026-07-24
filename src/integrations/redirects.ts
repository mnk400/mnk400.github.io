import type { AstroIntegration } from 'astro';
import { copyFile, writeFile, readdir } from 'node:fs/promises';
import { getMoreRedirects } from '../lib/more.ts';

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

// The old Jekyll site served posts at /YYYY/MM/DD/slug.html (default `date`
// permalink). Astro serves /YYYY/MM/DD/slug/ instead, so every URL Google had
// indexed now 404s. Emit a 301 from each post's .html URL to its canonical one.
async function getPostHtmlRedirects(): Promise<Array<{ from: string; to: string }>> {
  const postsDir = new URL('../content/posts/', import.meta.url);
  const files = await readdir(postsDir);
  return files
    .map((file) => file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.mdx?$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(([, year, month, day, slug]) => ({
      from: `/${year}/${month}/${day}/${slug}.html`,
      to: `/${year}/${month}/${day}/${slug}/`,
    }));
}

// Posts whose frontmatter date (and therefore URL) changed after Google indexed
// an earlier dated URL. These legacy URLs can't be derived from current
// filenames, so map them explicitly to the current canonical URL.
const legacyPostRedirects: Array<{ from: string; to: string }> = [
  { from: '/2024/03/04/ricoh-recipe.html', to: '/2025/02/07/ricoh-recipe/' },
  { from: '/2025/03/04/ricoh-recipe.html', to: '/2025/02/07/ricoh-recipe/' },
];

export default function redirects(): AstroIntegration {
  return {
    name: 'redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const rules = getMoreRedirects().flatMap(({ from, to }) => [
          `${from} ${withTrailingSlash(to)} 301`,
          `${withTrailingSlash(from)} ${withTrailingSlash(to)} 301`,
        ]);

        const postRedirects = [...(await getPostHtmlRedirects()), ...legacyPostRedirects];
        for (const { from, to } of postRedirects) {
          rules.push(`${from} ${to} 301`);
        }

        await writeFile(new URL('_redirects', dir), `${rules.join('\n')}\n`);
        logger.info(`wrote ${rules.length} redirect rule(s) to _redirects`);

        await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir));
        logger.info('wrote sitemap.xml compatibility alias');
      },
    },
  };
}
