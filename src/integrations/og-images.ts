import type { AstroIntegration } from 'astro';
import satori from 'satori';
// sharp's package.json exports map doesn't surface its types under nodenext resolution.
// @ts-expect-error -- runtime types come from sharp/lib/index.d.ts which resolves fine via JSDoc inference.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_REGULAR = new URL('../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff', import.meta.url);
const FONT_BOLD = new URL('../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff', import.meta.url);

const WIDTH = 1200;
const HEIGHT = 630;
const SITE_LABEL = 'manik.cc';

interface PageMeta {
  slug: string;
  title: string;
  heroPath: string | null;
}

async function findHtmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findHtmlFiles(full)));
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function extract(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1] : null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

function parsePage(html: string): PageMeta | null {
  // Skip redirect pages emitted by Astro.redirect()
  if (/<meta name="robots" content="noindex"/.test(html)) return null;

  const ogImage = extract(html, /<meta property="og:image" content="([^"]+)"/);
  if (!ogImage) return null;
  const slugMatch = ogImage.match(/\/og\/([^/]+)\.png/);
  if (!slugMatch) return null;

  const rawTitle = extract(html, /<title>([^<]+)<\/title>/);
  if (!rawTitle) return null;

  const heroPath = extract(html, /<meta name="x-og-source" content="([^"]+)"/);

  return {
    slug: slugMatch[1],
    title: decode(rawTitle).replace(/\s*—\s*Manik$/, '').trim() || 'Manik',
    heroPath,
  };
}

async function loadHeroDataUri(distDir: string, heroPath: string): Promise<string | null> {
  try {
    const clean = heroPath.replace(/^\//, '');
    const buf = await readFile(join(distDir, clean));
    const ext = clean.toLowerCase();
    const mime = ext.endsWith('.png') ? 'image/png' : ext.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    // Cover-fit at 1200x630 first so satori doesn't need to size it.
    const fitted = await sharp(buf).resize(WIDTH, HEIGHT, { fit: 'cover' }).toBuffer();
    return `data:${mime};base64,${fitted.toString('base64')}`;
  } catch {
    return null;
  }
}

interface SatoriNode {
  type: string;
  props: { style?: Record<string, unknown>; children?: SatoriNode[] | string };
}

function buildCard(title: string, heroDataUri: string | null): SatoriNode {
  const textBlock: SatoriNode = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        padding: '78px 82px',
        width: '100%',
        height: '100%',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: 42,
              color: heroDataUri ? 'rgba(255,255,255,0.76)' : '#656565',
              marginBottom: 24,
            },
            children: SITE_LABEL,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: heroDataUri ? '#fff' : '#3b3b3b',
              maxWidth: 1036,
            },
            children: title,
          },
        },
      ],
    },
  };

  if (!heroDataUri) {
    return {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          display: 'flex',
        },
        children: [textBlock],
      },
    };
  }

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        backgroundImage: `url(${heroDataUri})`,
        backgroundSize: `${WIDTH}px ${HEIGHT}px`,
        display: 'flex',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 100%)',
            },
            children: [textBlock],
          },
        },
      ],
    },
  };
}

async function generate(distDir: string, logger: { info: (msg: string) => void; warn: (msg: string) => void }) {
  const [fontRegular, fontBold] = await Promise.all([
    readFile(fileURLToPath(FONT_REGULAR)),
    readFile(fileURLToPath(FONT_BOLD)),
  ]);

  const ogDir = join(distDir, 'og');
  await mkdir(ogDir, { recursive: true });

  const htmls = await findHtmlFiles(distDir);
  const seen = new Set<string>();
  let generated = 0;
  let skippedExisting = 0;

  for (const file of htmls) {
    const html = await readFile(file, 'utf8');
    const page = parsePage(html);
    if (!page) continue;
    if (seen.has(page.slug)) {
      skippedExisting += 1;
      continue;
    }
    seen.add(page.slug);

    const heroDataUri = page.heroPath ? await loadHeroDataUri(distDir, page.heroPath) : null;
    const node = buildCard(page.title, heroDataUri);

    try {
      const svg = await satori(node as Parameters<typeof satori>[0], {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
          { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
        ],
      });

      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      await writeFile(join(ogDir, `${page.slug}.png`), png);
      generated += 1;
    } catch (error) {
      logger.warn(`og: failed for ${page.slug}: ${(error as Error).message}`);
    }
  }

  logger.info(`generated ${generated} card(s) in og/ (${skippedExisting} duplicate route(s) skipped)`);
}

export default function ogImages(): AstroIntegration {
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        await generate(fileURLToPath(dir), logger);
      },
    },
  };
}
