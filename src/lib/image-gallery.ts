import {
  createSelectionDropdown,
  createSelectionSwitch,
} from './selection-controls.ts';

interface GalleryManifest {
  base_url?: string;
  items?: RawGalleryItem[];
}

interface RawGalleryItem {
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

interface GalleryItem {
  raw: RawGalleryItem;
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
}

interface GalleryState {
  sortOptions: string[];
  filterOptions: string[];
  sort: string;
  filters: Record<string, string>;
  query: string;
}

interface RenderOptions {
  showCaptions: boolean;
  captionTitleFields: string[];
  captionBodyFields: string[];
  captionMetaFields: string[];
  zoomTitleFields: string[];
  zoomMetaFields: string[];
}

interface GalleryRoot extends HTMLElement {
  imageGalleryImageObserver?: IntersectionObserver | null;
}

const SORT_LABELS: Record<string, string> = {
  'year-desc': 'Latest first',
  'year-asc': 'Earliest first',
  'popularity-desc': 'Popular first',
};

function resolveUrl(value: unknown, baseUrl: string): string {
  if (!value) return '';
  const url = String(value);
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  if (!baseUrl) return url;

  const base = baseUrl.replace(/\/$/, '');
  const path = url.replace(/^\//, '');
  return `${base}/${path}`;
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
  const popularity = Number(item.popularity?.score) || 0;
  const tags = Array.isArray(item.tags) ? item.tags : [];

  const normalized: GalleryItem = {
    raw: item,
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
    popularity,
    searchText: '',
  };

  normalized.searchText = [
    normalized.title,
    normalized.description,
    normalized.year,
    Object.values(meta)
      .filter((value) => ['number', 'string'].includes(typeof value))
      .join(' '),
    tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return normalized;
}

function getFieldValue(item: GalleryItem, field: string): string | number {
  if (!field) return '';
  if (field.startsWith('meta:')) return item.meta?.[field.slice(5)] || '';
  if (field.startsWith('raw:')) return (item.raw?.[field.slice(4)] as string | number) || '';
  if (field === 'tags') return Array.isArray(item.raw?.tags) ? item.raw.tags.join(', ') : '';
  return (item[field as keyof GalleryItem] as string | number)
    || (item.raw?.[field] as string | number)
    || '';
}

function formatFields(item: GalleryItem, fields: string[]): string {
  return fields
    .map((field) => getFieldValue(item, field))
    .filter(Boolean)
    .join(' · ');
}

function getItemsFromManifest(manifest: GalleryManifest): RawGalleryItem[] {
  return Array.isArray(manifest.items) ? manifest.items : [];
}

function getYearValue(item: GalleryItem): number | null {
  const match = String(item.year || '').match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function getDecadeValue(item: GalleryItem): string {
  const year = getYearValue(item);
  if (!year) return '';
  return `${Math.floor(year / 10) * 10}s`;
}

const HUMANIZE_SMALL_WORDS = new Set(['and', 'of', 'on', 'the']);

function humanizeValue(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && HUMANIZE_SMALL_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function uniqueValues(items: GalleryItem[], getValue: (item: GalleryItem) => string | number): string[] {
  return Array.from(
    new Set(items.map((item) => String(getValue(item))).filter((value) => value !== '')),
  );
}

function filterValue(item: GalleryItem, option: string): string | number {
  if (option === 'decade') return getDecadeValue(item);
  return getFieldValue(item, option);
}

function filterLabel(option: string): string {
  if (option === 'decade') return 'Decade';
  if (option.startsWith('meta:')) return option.slice(5);
  return humanizeValue(option);
}

function controlIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sortItems(items: GalleryItem[], sortValue: string): GalleryItem[] {
  const sorted = [...items];

  if (sortValue === 'popularity-desc') {
    sorted.sort((a, b) => {
      if (a.popularity === b.popularity) return a.index - b.index;
      return b.popularity - a.popularity;
    });
  } else if (sortValue === 'year-asc' || sortValue === 'year-desc') {
    sorted.sort((a, b) => {
      const yearA = getYearValue(a);
      const yearB = getYearValue(b);

      if (yearA === yearB) return a.index - b.index;
      if (yearA === null) return 1;
      if (yearB === null) return -1;

      return sortValue === 'year-asc' ? yearA - yearB : yearB - yearA;
    });
  }

  return sorted;
}

function createControlGroup(label: string, control: HTMLElement): HTMLElement {
  const group = document.createElement('div');
  group.className = 'image-gallery__control-group field';
  group.setAttribute('aria-label', label);
  group.appendChild(control);
  return group;
}

function formatSummary(visibleCount: number, totalCount: number): string {
  if (visibleCount === totalCount) return `${totalCount.toLocaleString()} works`;
  return `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} works`;
}

function getVisibleItems(items: GalleryItem[], state: GalleryState): GalleryItem[] {
  const query = state.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    for (const option of state.filterOptions) {
      const selected = state.filters[option] || 'all';
      if (selected !== 'all' && filterValue(item, option) !== selected) return false;
    }
    if (query && !item.searchText.includes(query)) return false;
    return true;
  });

  return sortItems(filtered, state.sort);
}

function setupControls(
  root: GalleryRoot,
  items: GalleryItem[],
  galleryName: string,
  state: GalleryState,
  applyState: () => GalleryItem[],
) {
  const controlsRoot = root.querySelector<HTMLElement>('[data-gallery-controls-root]');
  if (!controlsRoot) return;

  controlsRoot.innerHTML = '';
  controlsRoot.hidden = false;

  if (state.sortOptions.length > 1) {
    const sortOptions = state.sortOptions.map((value) => ({
      value,
      label: SORT_LABELS[value] || value,
    }));
    const sortSwitch = createSelectionSwitch({
      id: `image-gallery-sort-${galleryName}`,
      ariaLabel: 'Sort paintings',
      options: sortOptions,
      active: state.sort,
      size: 'small',
    });
    sortSwitch.addEventListener('change', (event) => {
      state.sort = (event as CustomEvent).detail.value;
      applyState();
    });
    controlsRoot.appendChild(createControlGroup('Sort', sortSwitch));
  }

  state.filterOptions.forEach((option) => {
    const label = filterLabel(option);
    const values = uniqueValues(items, (item) => filterValue(item, option));
    if (values.length <= 1) return;

    if (option === 'decade') {
      values.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    }

    const filterOptions = values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => {
        if (option === 'decade') return 0;
        return a.label.localeCompare(b.label);
      });

    const controlConfig = {
      id: `image-gallery-${controlIdPart(option)}-${galleryName}`,
      ariaLabel: `Filter by ${label.toLowerCase()}`,
      options: [
        { value: 'all', label: option === 'decade' ? 'All' : `All ${label.toLowerCase()}` },
        ...filterOptions,
      ],
      active: state.filters[option] || 'all',
    };
    const control = option === 'decade'
      ? createSelectionSwitch({ ...controlConfig, size: 'small' })
      : createSelectionDropdown(controlConfig);

    control.addEventListener('change', (event) => {
      state.filters[option] = (event as CustomEvent).detail.value;
      applyState();
    });
    controlsRoot.appendChild(createControlGroup(label, control));
  });
}

function setLoaded(card: HTMLElement, img: HTMLImageElement) {
  const markLoaded = () => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratioBox = img.closest<HTMLElement>('.image-ratio-box');
      if (ratioBox) ratioBox.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    }
    card.classList.add('loaded');
  };
  if (img.complete && img.naturalWidth > 0) {
    markLoaded();
    return;
  }
  img.addEventListener('load', markLoaded, { once: true });
  img.addEventListener('error', markLoaded, { once: true });
}

function loadImage(img: HTMLImageElement) {
  if (!img.dataset.src || img.getAttribute('src')) return;
  img.src = img.dataset.src;
}

function observeImage(img: HTMLImageElement, observer: IntersectionObserver | null) {
  if (observer) {
    observer.observe(img);
    return;
  }

  loadImage(img);
}

function createImageObserver(): IntersectionObserver | null {
  if (!('IntersectionObserver' in window)) return null;

  return new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        loadImage(entry.target as HTMLImageElement);
      });
    },
    { rootMargin: '800px 0px' },
  );
}

function createCard(item: GalleryItem, options: RenderOptions & { galleryIndex: number }): HTMLElement {
  const card = document.createElement('div');
  card.className = 'image-card image-gallery-card';

  const ratioBox = document.createElement('div');
  ratioBox.className = 'image-ratio-box';
  ratioBox.style.aspectRatio = `${item.width || 1} / ${item.height || 1}`;

  const img = document.createElement('img');
  img.dataset.src = item.thumb;
  img.alt = item.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.setAttribute('data-zoomable', '');
  img.setAttribute('data-full-src', item.full);
  img.setAttribute('data-gallery-index', String(options.galleryIndex ?? item.index));
  const zoomTitle = formatFields(item, options.zoomTitleFields);
  const zoomMeta = formatFields(item, options.zoomMetaFields);
  if (zoomTitle) img.setAttribute('data-title', zoomTitle);
  if (zoomMeta) img.setAttribute('data-meta', zoomMeta);

  ratioBox.appendChild(img);
  card.appendChild(ratioBox);

  const captionTitle = formatFields(item, options.captionTitleFields);
  const captionBody = formatFields(item, options.captionBodyFields);
  const captionMeta = formatFields(item, options.captionMetaFields);

  if (options.showCaptions && (captionTitle || captionBody || captionMeta)) {
    const caption = document.createElement('div');
    caption.className = 'image-gallery-card__caption';

    if (captionTitle) {
      const title = document.createElement('div');
      title.className = 'image-gallery-card__title';
      title.textContent = captionTitle;
      caption.appendChild(title);
    }

    if (captionBody) {
      const body = document.createElement('div');
      body.className = 'image-gallery-card__body';
      body.textContent = captionBody;
      caption.appendChild(body);
    }

    if (captionMeta) {
      const meta = document.createElement('div');
      meta.className = 'image-gallery-card__meta';
      meta.textContent = captionMeta;
      caption.appendChild(meta);
    }

    card.appendChild(caption);
  }
  setLoaded(card, img);

  return card;
}

function renderMasonry(
  root: GalleryRoot,
  grid: HTMLElement,
  items: GalleryItem[],
  galleryName: string,
  options: RenderOptions,
) {
  if (root.imageGalleryImageObserver) root.imageGalleryImageObserver.disconnect();

  grid.innerHTML = '';
  grid.setAttribute('data-gallery', galleryName || 'image-gallery');

  const imageObserver = createImageObserver();
  root.imageGalleryImageObserver = imageObserver;

  const leftCol = document.createElement('div');
  const rightCol = document.createElement('div');
  leftCol.className = 'masonry-column';
  rightCol.className = 'masonry-column';
  grid.append(leftCol, rightCol);

  let leftHeight = 0;
  let rightHeight = 0;
  let imageCount = 0;

  items.forEach((item, displayIndex) => {
    if (!item.thumb) return;

    const card = createCard(item, {
      ...options,
      galleryIndex: displayIndex,
    });
    const aspectRatio = item.width && item.height ? item.width / item.height : 1;
    const estimatedHeight = 300 / aspectRatio;

    if (leftHeight <= rightHeight) {
      leftCol.appendChild(card);
      leftHeight += estimatedHeight;
    } else {
      rightCol.appendChild(card);
      rightHeight += estimatedHeight;
    }

    const img = card.querySelector<HTMLImageElement>('img');
    if (!img) return;
    if (imageCount < 12) {
      loadImage(img);
    } else {
      observeImage(img, imageObserver);
    }
    imageCount += 1;
  });
}

function readConfig(root: GalleryRoot): ImageGalleryConfig | null {
  const configEl = root.querySelector<HTMLScriptElement>('[data-image-gallery-config]');
  if (!configEl?.textContent) return null;
  return JSON.parse(configEl.textContent) as ImageGalleryConfig;
}

export async function loadImageGallery(root: GalleryRoot, config: ImageGalleryConfig) {
  const source = config.source;
  const galleryName = config.galleryName;
  const baseUrlOverride = config.baseUrl || '';
  const showCaptions = config.showCaptions !== false;
  const captionTitleFields = config.captionTitle ?? ['title'];
  const captionBodyFields = config.captionBody ?? [];
  const captionMetaFields = config.captionMeta ?? [];
  const zoomTitleFields = config.zoomTitle ?? ['title'];
  const zoomMetaFields = config.zoomMeta ?? [];
  const grid = root.querySelector<HTMLElement>('[data-gallery-grid]');
  const status = root.querySelector<HTMLElement>('[data-gallery-status]');
  const summary = root.querySelector<HTMLElement>('[data-gallery-summary]');

  if (!source || !grid) return;

  const slowLoadTimer = status
    ? window.setTimeout(() => {
      status.hidden = false;
    }, 500)
    : null;

  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Failed to fetch gallery manifest: ${response.status}`);

    const manifest = await response.json() as GalleryManifest;
    const baseUrl = baseUrlOverride || manifest.base_url || '';
    const rawItems = getItemsFromManifest(manifest);
    const items = rawItems.map((item, index) => normalizeItem(item, index, baseUrl));
    const state: GalleryState = {
      sortOptions: config.sortOptions ?? [],
      filterOptions: config.filterOptions ?? [],
      sort: config.defaultSort || config.sortOptions?.[0] || 'manifest',
      filters: {},
      query: root.dataset.searchQuery || '',
    };
    state.filterOptions.forEach((option) => {
      state.filters[option] = 'all';
    });

    const applyState = () => {
      const visibleItems = getVisibleItems(items, state);
      if (summary) {
        summary.hidden = false;
        summary.textContent = formatSummary(visibleItems.length, items.length);
      }
      renderMasonry(root, grid, visibleItems, galleryName, {
        showCaptions,
        captionTitleFields,
        captionBodyFields,
        captionMetaFields,
        zoomTitleFields,
        zoomMetaFields,
      });
      return visibleItems;
    };

    if (slowLoadTimer) window.clearTimeout(slowLoadTimer);
    if (status) status.hidden = true;

    if (config.controls) setupControls(root, items, galleryName, state, applyState);

    root.addEventListener('site-search:change', (event) => {
      state.query = (event as CustomEvent).detail?.query || '';
      const visibleItems = applyState();
      root.dispatchEvent(new CustomEvent('image-gallery:filtered', {
        detail: { items, visibleItems, query: state.query },
      }));
    });

    const visibleItems = applyState();
    root.classList.add('is-ready');
    root.dispatchEvent(new CustomEvent('image-gallery:loaded', {
      detail: { manifest, items, visibleItems },
    }));
  } catch (error) {
    console.error('Error loading image gallery:', error);
    if (slowLoadTimer) window.clearTimeout(slowLoadTimer);
    if (status) {
      status.hidden = false;
      status.textContent = 'Could not load images. Please try again later.';
    }
  }
}

export function initImageGalleries(root: ParentNode = document) {
  root.querySelectorAll<GalleryRoot>('[data-image-gallery]').forEach((galleryRoot) => {
    if (galleryRoot.dataset.imageGalleryInitialized === 'true') return;
    const config = readConfig(galleryRoot);
    if (!config) return;
    galleryRoot.dataset.imageGalleryInitialized = 'true';
    void loadImageGallery(galleryRoot, config);
  });
}
