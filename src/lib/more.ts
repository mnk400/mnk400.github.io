import yaml from 'js-yaml';
import { getMoreCategory } from '../data/categories.ts';
import { astroMoreItems, type MoreItemData } from '../data/more-items.ts';

type RawFrontmatter = Record<string, unknown>;

export interface MoreProductDownload {
  url: string;
  label: string;
  icon?: string;
}

export interface MoreProductInstall {
  label: string;
  command: string;
  displayCommand?: string;
}

export interface MoreProductFeature {
  icon?: string;
  title: string;
  body: string;
}

export interface MoreReadmeImage {
  path: string;
  width?: number;
  height?: number;
}

export interface MoreItem {
  id: string;
  sourcePath: string;
  relPath: string;
  segments: string[];
  root: string;
  slug: string;
  groupPath: string;
  isHub: boolean;
  ported: boolean;
  listed: boolean;
  url: string;
  redirectFrom: string[];
  title: string;
  shortTitle?: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  tags: string[];
  order?: number;
  years?: string;
  works?: string;
  entity?: {
    type?: string;
    name?: string;
    same_as?: string[];
  };
  layout?: string;
  kind?: string;
  icon?: string;
  tagline?: string;
  repo?: string;
  branch?: string;
  download?: MoreProductDownload;
  install?: MoreProductInstall[];
  meta?: string[];
  heroImage?: string;
  heroImageWidth?: number;
  heroImageHeight?: number;
  features?: MoreProductFeature[];
  readmeImages?: MoreReadmeImage[];
}

export interface MoreGroup {
  path: string;
  root: string;
  label: string;
  chip: string;
  sort: 'title' | 'order';
  rootHub?: MoreItem;
  hub?: MoreItem;
  items: MoreItem[];
}

const rawFiles = import.meta.glob('../../_more/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toRedirects(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? toStringArray(value) : toString(value) ? [String(value)] : [];
}

function toInstall(value: unknown): MoreProductInstall[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as RawFrontmatter;
    const label = toString(record.label);
    const command = toString(record.command);
    if (!label || !command) return [];
    return [{
      label,
      command,
      displayCommand: toString(record.display_command),
    }];
  });
  return entries.length ? entries : undefined;
}

function toDownload(value: unknown): MoreProductDownload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as RawFrontmatter;
  const url = toString(record.url);
  const label = toString(record.label);
  if (!url || !label) return undefined;
  return { url, label, icon: toString(record.icon) };
}

function toFeatures(value: unknown): MoreProductFeature[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const features = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as RawFrontmatter;
    const title = toString(record.title);
    const body = toString(record.body);
    if (!title || !body) return [];
    return [{ title, body, icon: toString(record.icon) }];
  });
  return features.length ? features : undefined;
}

function toReadmeImages(value: unknown): MoreReadmeImage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as RawFrontmatter;
    const path = toString(record.path);
    if (!path) return [];
    return [{
      path,
      width: toNumber(record.width),
      height: toNumber(record.height),
    }];
  });
  return images.length ? images : undefined;
}

function parseFrontmatter(source: string, sourcePath: string): RawFrontmatter {
  const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return {};
  const parsed = yaml.load(match[1]);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Expected object front matter in ${sourcePath}`);
  }
  return parsed as RawFrontmatter;
}

function pathToUrl(relPath: string, frontmatter: RawFrontmatter): string {
  const permalink = toString(frontmatter.permalink);
  if (permalink) return permalink;

  const withoutExt = relPath.replace(/\.html$/, '');
  const withoutIndex = withoutExt.endsWith('/index')
    ? withoutExt.slice(0, -'/index'.length)
    : withoutExt;
  return `/${withoutIndex}/`;
}

function routeDetailsFromSegments(routeSegments: string[]) {
  const root = routeSegments[0] ?? '';
  const slug = routeSegments.at(-1) ?? root;
  const groupPath = routeSegments.slice(0, -1).join('/');

  return { root, slug, groupPath };
}

function normalizeAstroMoreItem(item: MoreItemData): MoreItem {
  const segments = item.id.split('/').filter(Boolean);
  const isHub = item.isHub === true;
  const { root, slug, groupPath } = routeDetailsFromSegments(segments);

  return {
    id: item.id,
    sourcePath: 'src/data/more-items.ts',
    relPath: `${item.id}${isHub ? '/index' : ''}.astro`,
    segments,
    root,
    slug,
    groupPath,
    isHub,
    ported: true,
    listed: item.listed !== false,
    url: item.url ?? `/${item.id}/`,
    redirectFrom: item.redirectFrom ?? [],
    title: item.title,
    shortTitle: item.shortTitle,
    description: item.description,
    image: item.image,
    externalUrl: undefined,
    tags: item.tags ?? [],
    order: item.order,
    years: item.years,
    works: item.works,
    entity: item.entity,
  };
}

function normalizeLegacyMoreItem(sourcePath: string, source: string): MoreItem {
  const frontmatter = parseFrontmatter(source, sourcePath);
  const relPath = sourcePath.replace(/^.*?_more\//, '');
  const segments = relPath.replace(/\.html$/, '').split('/');
  const isHub = segments.at(-1) === 'index';
  const routeSegments = isHub ? segments.slice(0, -1) : segments;
  const { root, slug, groupPath } = routeDetailsFromSegments(routeSegments);
  const title = toString(frontmatter.title) ?? slug;

  return {
    id: routeSegments.join('/'),
    sourcePath,
    relPath,
    segments: routeSegments,
    root,
    slug,
    groupPath,
    isHub,
    ported: false,
    listed: frontmatter.disabled !== true,
    url: pathToUrl(relPath, frontmatter),
    redirectFrom: toRedirects(frontmatter.redirect_from),
    title,
    shortTitle: toString(frontmatter.short_title),
    description: toString(frontmatter.description),
    image: toString(frontmatter.image),
    externalUrl: toString(frontmatter.external_url),
    tags: toStringArray(frontmatter.tags),
    order: toNumber(frontmatter.order),
    years: toString(frontmatter.years),
    works: toString(frontmatter.works),
    entity: frontmatter.entity && typeof frontmatter.entity === 'object'
      ? frontmatter.entity as MoreItem['entity']
      : undefined,
    layout: toString(frontmatter.layout),
    kind: toString(frontmatter.kind),
    icon: toString(frontmatter.icon),
    tagline: toString(frontmatter.tagline),
    repo: toString(frontmatter.repo),
    branch: toString(frontmatter.branch),
    download: toDownload(frontmatter.download),
    install: toInstall(frontmatter.install),
    meta: toStringArray(frontmatter.meta),
    heroImage: toString(frontmatter.hero_image),
    heroImageWidth: toNumber(frontmatter.hero_image_width),
    heroImageHeight: toNumber(frontmatter.hero_image_height),
    features: toFeatures(frontmatter.features),
    readmeImages: toReadmeImages(frontmatter.readme_images),
  };
}

function compareByTitle(a: MoreItem, b: MoreItem): number {
  return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
}

function compareByOrder(a: MoreItem, b: MoreItem): number {
  const aOrder = a.order ?? Number.POSITIVE_INFINITY;
  const bOrder = b.order ?? Number.POSITIVE_INFINITY;
  return aOrder - bOrder || compareByTitle(a, b);
}

const normalizedAstroMoreItems = astroMoreItems.map(normalizeAstroMoreItem);
const astroMoreIds = new Set(normalizedAstroMoreItems.map((item) => item.id));

const normalizedLegacyMoreItems = Object.entries(rawFiles)
  .map(([path, source]) => normalizeLegacyMoreItem(path, String(source)))
  .filter((item) => !astroMoreIds.has(item.id));

export const moreItems = [
  ...normalizedAstroMoreItems,
  ...normalizedLegacyMoreItems,
]
  .sort((a, b) => a.id.localeCompare(b.id));

export const listedMoreItems = moreItems.filter((item) => item.listed);

export const moreLeafItems = listedMoreItems.filter((item) => !item.isHub && item.segments.length > 1);

export const portedMoreItems = moreItems.filter((item) => item.ported);

export function getMoreRoots(): string[] {
  return Array.from(new Set(moreLeafItems.map((item) => item.root))).sort();
}

export function getMoreGroups(): MoreGroup[] {
  const hubsByUrl = new Map(listedMoreItems.filter((item) => item.isHub).map((item) => [item.url, item]));
  const byPath = new Map<string, MoreItem[]>();

  for (const item of moreLeafItems) {
    const existing = byPath.get(item.groupPath);
    if (existing) {
      existing.push(item);
    } else {
      byPath.set(item.groupPath, [item]);
    }
  }

  return Array.from(byPath.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, items]) => {
      const root = path.split('/')[0] ?? path;
      const groupSlug = path.split('/').at(-1) ?? path;
      const rootCategory = getMoreCategory(root);
      const groupCategory = getMoreCategory(path);
      const sort = groupCategory?.sort ?? rootCategory?.sort ?? 'title';
      const sortedItems = [...items].sort(sort === 'order' ? compareByOrder : compareByTitle);

      return {
        path,
        root,
        label: groupCategory?.label ?? rootCategory?.label ?? groupSlug,
        chip: groupCategory?.chip ?? groupSlug,
        sort,
        rootHub: hubsByUrl.get(`/${root}/`),
        hub: hubsByUrl.get(`/${path}/`),
        items: sortedItems,
      };
    });
}

export function getMoreSearchText(item: MoreItem, group: MoreGroup): string {
  const rootCategory = getMoreCategory(item.root);
  return [
    item.title,
    item.shortTitle,
    item.description,
    rootCategory?.label,
    group.label,
    ...item.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getMoreRedirects(): Array<{ from: string; to: string }> {
  return moreItems.flatMap((item) => item.redirectFrom.map((from) => ({ from, to: item.url })));
}

export function getPortedMoreRedirects(): Array<{ from: string; to: string }> {
  return portedMoreItems.flatMap((item) => item.redirectFrom.map((from) => ({ from, to: item.url })));
}
