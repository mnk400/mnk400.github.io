/// <reference types="@cloudflare/workers-types" />

// Shared Pages Functions middleware for gallery deep links.
//
// When a crawler unfurls a deep-linked gallery URL (`/photos/?image=<id>`),
// the static HTML only carries the generic gallery card. This rewrites the
// Open Graph / Twitter tags to describe the specific image instead.
//
// It is source-agnostic: each gallery page embeds its own manifest `source`
// in a `data-image-gallery-config` JSON blob, so whether the manifest lives on
// media.manik.cc or same-origin is just a `fetch`. No route->manifest mapping.

interface GalleryItem {
  id: string;
  title?: string;
  thumb?: string;
  full?: string;
  description?: string;
  meta?: Record<string, string>;
}

interface Manifest {
  name?: string;
  base_url?: string;
  items?: GalleryItem[];
}

// Known link-unfurl crawlers. Anything else gets the untouched static asset.
const BOTS =
  /(slackbot|twitterbot|facebookexternalhit|discordbot|whatsapp|linkedinbot|telegrambot|applebot|pinterest|redditbot|bsky|embedly|vkshare|skypeuripreview|iframely|googlebot)/i;

// Pulls the embedded gallery config: <script ... data-image-gallery-config>{...}</script>
// Captures up to </script> (which JSON can't contain) so nested braces are safe.
const CONFIG_RE = /data-image-gallery-config[^>]*>([\s\S]*?)<\/script>/;

// Basename of an image path, extension stripped — used as a title fallback
// for untitled items (e.g. "full/dscf5881.jpg" -> "dscf5881").
function filenameTitle(path: string): string {
  const base = path.split(/[?#]/)[0].split('/').pop() ?? '';
  return base.replace(/\.[^.]+$/, '') || base;
}

// Mirrors src/lib/image-gallery/data.ts `resolveUrl`: absolute/data URLs pass
// through; relative paths are concatenated onto base_url (one slash between).
function resolveUrl(url: string, baseUrl: string): string {
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || !baseUrl) return url;
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

export const onRequest: PagesFunction = async (ctx) => {
  const res = await ctx.next();
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('image');
  const ua = ctx.request.headers.get('user-agent') ?? '';

  // Only rewrite crawler unfurls of a deep link; humans keep the fast static path.
  if (!id || !BOTS.test(ua)) return res;
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;

  const html = await res.text();
  // `res` is only reused as ResponseInit (status + headers); its body is spent.
  const passthrough = () => new Response(html, res);

  const configJson = html.match(CONFIG_RE)?.[1]?.trim();
  if (!configJson) return passthrough();

  let config: { source?: string; baseUrl?: string };
  try {
    config = JSON.parse(configJson);
  } catch {
    return passthrough();
  }
  const source = config.source;
  if (!source) return passthrough();

  let manifest: Manifest;
  try {
    manifest = await fetch(new URL(source, url).toString(), {
      // Edge-cache the manifest so unfurls don't round-trip cross-origin each time.
      cf: { cacheTtl: 300, cacheEverything: true },
    }).then((r) => r.json<Manifest>());
  } catch {
    return passthrough();
  }

  const item = manifest.items?.find((i) => i.id === id);
  if (!item?.thumb) return passthrough();

  // Thumbs are pre-sized (~400px) — serve as-is, no edge image processing.
  // Resolve the same way the gallery client does (data.ts `resolveUrl`):
  // string concatenation, not URL relative resolution.
  const baseUrl = config.baseUrl || manifest.base_url || '';
  const image = resolveUrl(item.thumb, baseUrl);
  const title =
    item.title || filenameTitle(item.full || item.thumb || item.id) || manifest.name || 'Manik';
  const description =
    item.description || item.meta?.Camera || `Photo from ${manifest.name ?? 'the gallery'}`;

  const setContent = (value: string) => ({
    element(el: Element) {
      el.setAttribute('content', value);
    },
  });

  // canonical / og:url are deliberately left pointing at the gallery base.
  return new HTMLRewriter()
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:image"]', setContent(image))
    .on('meta[name="twitter:image"]', setContent(image))
    .transform(passthrough());
};
