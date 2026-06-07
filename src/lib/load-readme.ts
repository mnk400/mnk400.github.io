// Build-time README fetcher for product pages. Pulls the README from GitHub
// raw, runs the rewrites that the legacy client-side renderer used to do, and
// returns markdown ready to go through Astro's normal markdown pipeline.

import type { ProductItemData, ProductReadmeImage } from '../data/more/products.ts';

const SITE_STRIP_RE = /<!--\s*site:strip-start\s*-->[\s\S]*?<!--\s*site:strip-end\s*-->/g;
const MD_IMAGE_RE = /!\[([^\]]*)\]\((?!https?:\/\/)([^)\s]+)(?:\s+"([^"]*)")?\)/g;
const HTML_IMG_RE = /<img\s+([^>]*?)\bsrc=["'](?!https?:\/\/)([^"']+)["']([^>]*)>/g;
const MD_LINK_RE = /(^|[^!])\[([^\]]+)\]\((?!https?:\/\/|#|mailto:)([^)\s]+)\)/g;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function findDims(
  images: ProductReadmeImage[] | undefined,
  path: string,
): { width?: number; height?: number } {
  if (!images) return {};
  const match = images.find((entry) => path === entry.path || path.endsWith('/' + entry.path));
  return match ? { width: match.width, height: match.height } : {};
}

function rewrite(md: string, product: ProductItemData): string {
  const repo = product.repo!;
  const branch = product.branch ?? 'main';
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}`;
  const blobBase = `https://github.com/${repo}/blob/${branch}/`;

  return md
    .replace(SITE_STRIP_RE, '')
    .replace(MD_IMAGE_RE, (_match, alt: string, path: string) => {
      const cleaned = path.replace(/^\.\//, '');
      const { width, height } = findDims(product.readmeImages, cleaned);
      const w = width ? ` width="${width}"` : '';
      const h = height ? ` height="${height}"` : '';
      return `<img alt="${escapeAttr(alt)}" src="${rawBase}/${cleaned}" data-zoomable${w}${h} />`;
    })
    .replace(HTML_IMG_RE, (_match, before: string, path: string, after: string) => {
      const cleaned = path.replace(/^\.\//, '');
      const existing = before + after;
      const { width, height } = findDims(product.readmeImages, cleaned);
      const w = width && !/\bwidth\s*=/.test(existing) ? ` width="${width}"` : '';
      const h = height && !/\bheight\s*=/.test(existing) ? ` height="${height}"` : '';
      const zoom = /\bdata-zoomable\b/.test(existing) ? '' : ' data-zoomable';
      return `<img ${before}src="${rawBase}/${cleaned}"${after}${zoom}${w}${h}>`;
    })
    .replace(MD_LINK_RE, (_match, prefix: string, text: string, path: string) => {
      const cleaned = path.replace(/^\.\//, '');
      return `${prefix}[${text}](${blobBase}${cleaned})`;
    });
}

export async function fetchReadmeMarkdown(product: ProductItemData): Promise<string | null> {
  if (!product.repo) return null;
  const branch = product.branch ?? 'main';
  const url = `https://raw.githubusercontent.com/${product.repo}/${branch}/README.md`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[readme] ${product.id}: ${url} → ${res.status}`);
    return null;
  }
  return rewrite(await res.text(), product);
}
