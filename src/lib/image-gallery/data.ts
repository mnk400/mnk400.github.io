export interface ImageGalleryConfig {
  source: string;
  galleryName: string;
  baseUrl?: string;
  loadingText?: string;
  showCaptions?: boolean;
  controls?: boolean;
  sortOptions?: string[];
  defaultSort?: string;
  filterOptions?: string[];
  captionTitle?: string[];
  captionBody?: string[];
  captionMeta?: string[];
  zoomTitle?: string[];
  zoomMeta?: string[];
  pageSize?: number;
}

export interface GalleryManifest {
  base_url?: string;
  items?: RawGalleryItem[];
}

interface RawGalleryItem {
  id?: string;
  title?: string;
  description?: string;
  year?: string | number;
  thumb?: string;
  full?: string;
  width?: string | number;
  height?: string | number;
  tags?: string[];
  meta?: Record<string, string | number>;
  popularity?: { score?: string | number };
  [key: string]: unknown;
}

export interface GalleryItem {
  raw: RawGalleryItem;
  id: string;
  index: number;
  title: string;
  description: string;
  meta: Record<string, string | number>;
  alt: string;
  year: string | number;
  thumb: string;
  full: string;
  width: number | null;
  height: number | null;
  popularity: number;
  searchText: string;
}

export interface GalleryState {
  sortOptions: string[];
  filterOptions: string[];
  sort: string;
  filters: Record<string, string>;
  query: string;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 100;
const HUMANIZE_SMALL_WORDS = new Set(['and', 'of', 'on', 'the']);

function resolveUrl(value: unknown, baseUrl: string): string {
  if (!value) return '';
  const url = String(value);
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || !baseUrl) return url;
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function normalizeItem(item: RawGalleryItem, index: number, baseUrl: string): GalleryItem {
  const title = item.title || '';
  const description = item.description || '';
  const year = item.year || '';
  const meta = item.meta && typeof item.meta === 'object' ? item.meta : {};
  const thumb = resolveUrl(item.thumb, baseUrl);
  const full = resolveUrl(item.full, baseUrl) || thumb;
  const width = Number(item.width);
  const height = Number(item.height);
  const normalized: GalleryItem = {
    raw: item,
    id: String(item.id || item.full || item.thumb || `item-${index + 1}`),
    index,
    title: String(title),
    description: String(description),
    meta,
    alt: String(title || description || 'Gallery image'),
    year,
    thumb,
    full,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    popularity: Number(item.popularity?.score) || 0,
    searchText: '',
  };
  normalized.searchText = [
    normalized.title,
    normalized.description,
    year,
    Object.values(meta).filter((value) => ['number', 'string'].includes(typeof value)).join(' '),
    Array.isArray(item.tags) ? item.tags.join(' ') : '',
  ].filter(Boolean).join(' ').toLowerCase();
  return normalized;
}

export function normalizeGalleryItems(
  manifest: GalleryManifest,
  baseUrlOverride = '',
): GalleryItem[] {
  const baseUrl = baseUrlOverride || manifest.base_url || '';
  return (Array.isArray(manifest.items) ? manifest.items : [])
    .map((item, index) => normalizeItem(item, index, baseUrl));
}

export function createGalleryState(config: ImageGalleryConfig, query = ''): GalleryState {
  const filterOptions = config.filterOptions ?? [];
  return {
    sortOptions: config.sortOptions ?? [],
    filterOptions,
    sort: config.defaultSort || config.sortOptions?.[0] || 'manifest',
    filters: Object.fromEntries(filterOptions.map((option) => [option, 'all'])),
    query,
    pageSize: config.pageSize && config.pageSize > 0 ? config.pageSize : DEFAULT_PAGE_SIZE,
  };
}

function fieldValue(item: GalleryItem, field: string): string | number {
  if (!field) return '';
  if (field.startsWith('meta:')) return item.meta[field.slice(5)] || '';
  if (field.startsWith('raw:')) return (item.raw[field.slice(4)] as string | number) || '';
  if (field === 'tags') return Array.isArray(item.raw.tags) ? item.raw.tags.join(', ') : '';
  return (item[field as keyof GalleryItem] as string | number)
    || (item.raw[field] as string | number)
    || '';
}

export function formatFields(item: GalleryItem, fields: string[]): string {
  return fields.map((field) => fieldValue(item, field)).filter(Boolean).join(' · ');
}

function yearValue(item: GalleryItem): number | null {
  const match = String(item.year || '').match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function filterValue(item: GalleryItem, option: string): string | number {
  if (option !== 'decade') return fieldValue(item, option);
  const year = yearValue(item);
  return year ? `${Math.floor(year / 10) * 10}s` : '';
}

export function filterLabel(option: string): string {
  if (option === 'decade') return 'Decade';
  if (option.startsWith('meta:')) return option.slice(5);
  return option.replace(/[-_]+/g, ' ').split(' ').map((word, index) => (
    index > 0 && HUMANIZE_SMALL_WORDS.has(word.toLowerCase())
      ? word.toLowerCase()
      : word.charAt(0).toUpperCase() + word.slice(1)
  )).join(' ');
}

export function filterValues(items: GalleryItem[], option: string): string[] {
  return [...new Set(items.map((item) => String(filterValue(item, option))).filter(Boolean))];
}

export function sortItems(items: GalleryItem[], sort: string): GalleryItem[] {
  const sorted = [...items];
  if (sort === 'popularity-desc') {
    return sorted.sort((a, b) => b.popularity - a.popularity || a.index - b.index);
  }
  if (sort === 'year-asc' || sort === 'year-desc') {
    return sorted.sort((a, b) => {
      const aYear = yearValue(a);
      const bYear = yearValue(b);
      if (aYear === bYear) return a.index - b.index;
      if (aYear === null) return 1;
      if (bYear === null) return -1;
      return sort === 'year-asc' ? aYear - bYear : bYear - aYear;
    });
  }
  return sorted;
}

export function getVisibleItems(items: GalleryItem[], state: GalleryState): GalleryItem[] {
  const query = state.query.trim().toLowerCase();
  return sortItems(items.filter((item) => (
    state.filterOptions.every((option) => {
      const selected = state.filters[option] || 'all';
      return selected === 'all' || filterValue(item, option) === selected;
    }) && (!query || item.searchText.includes(query))
  )), state.sort);
}
