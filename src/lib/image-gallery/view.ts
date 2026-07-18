import {
  createSelectionDropdown,
  createSelectionSwitch,
} from '../selection-controls.ts';
import {
  filterLabel,
  filterValues,
  formatFields,
  getVisibleItems,
  type GalleryItem,
  type GalleryState,
  type ImageGalleryConfig,
} from './data.ts';

interface GalleryViewOptions {
  root: HTMLElement;
  grid: HTMLElement;
  summary: HTMLElement | null;
  sentinel: HTMLElement | null;
  galleryName: string;
  items: GalleryItem[];
  state: GalleryState;
  config: ImageGalleryConfig;
}

interface RenderOptions {
  showCaptions: boolean;
  captionTitleFields: string[];
  captionBodyFields: string[];
  captionMetaFields: string[];
  zoomTitleFields: string[];
  zoomMetaFields: string[];
}

interface RenderState {
  columns: HTMLElement[];
  heights: number[];
  renderedCount: number;
}

const SORT_LABELS: Record<string, string> = {
  'year-desc': 'Latest first',
  'year-asc': 'Earliest first',
  'popularity-desc': 'Popular first',
};

function div(className: string, text = ''): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}

function createControlGroup(label: string, control: HTMLElement): HTMLElement {
  const group = div('image-gallery__control-group field');
  group.setAttribute('aria-label', label);
  group.appendChild(control);
  return group;
}

function setLoaded(card: HTMLElement, image: HTMLImageElement, ratioBox: HTMLElement) {
  const markLoaded = () => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      ratioBox.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      delete ratioBox.dataset.ratioPending;
    }
    card.classList.add('loaded');
  };
  if (image.complete && image.naturalWidth > 0) markLoaded();
  else {
    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markLoaded, { once: true });
  }
}

function createCard(item: GalleryItem, index: number, options: RenderOptions): HTMLElement {
  const card = div('image-card image-gallery-card');
  const ratioBox = div('image-ratio-box');
  if (item.width && item.height) ratioBox.style.aspectRatio = `${item.width} / ${item.height}`;
  else {
    ratioBox.style.aspectRatio = '1 / 1';
    ratioBox.dataset.ratioPending = 'true';
  }

  const image = document.createElement('img');
  image.src = item.thumb;
  image.alt = item.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  if (item.width && item.height) {
    image.width = item.width;
    image.height = item.height;
  }
  image.dataset.zoomable = '';
  image.dataset.fullSrc = item.full;
  image.dataset.galleryIndex = String(index);
  image.dataset.galleryItemId = item.id;
  image.role = 'button';
  image.tabIndex = 0;
  image.setAttribute('aria-label', `Open ${item.alt}`);
  const zoomTitle = formatFields(item, options.zoomTitleFields);
  const zoomMeta = formatFields(item, options.zoomMetaFields);
  if (zoomTitle) image.dataset.title = zoomTitle;
  if (zoomMeta) image.dataset.meta = zoomMeta;
  ratioBox.appendChild(image);
  card.appendChild(ratioBox);

  const captionParts = [
    ['image-gallery-card__title', formatFields(item, options.captionTitleFields)],
    ['image-gallery-card__body', formatFields(item, options.captionBodyFields)],
    ['image-gallery-card__meta', formatFields(item, options.captionMetaFields)],
  ];
  if (options.showCaptions && captionParts.some(([, text]) => text)) {
    const caption = div('image-gallery-card__caption');
    captionParts.forEach(([className, text]) => {
      if (text) caption.appendChild(div(className, text));
    });
    card.appendChild(caption);
  }
  setLoaded(card, image, ratioBox);
  return card;
}

function appendPage(
  renderState: RenderState,
  items: GalleryItem[],
  pageSize: number,
  options: RenderOptions,
): boolean {
  const end = Math.min(items.length, renderState.renderedCount + pageSize);
  for (let index = renderState.renderedCount; index < end; index += 1) {
    const item = items[index];
    if (item.thumb) {
      const column = renderState.heights[0] <= renderState.heights[1] ? 0 : 1;
      renderState.columns[column].appendChild(createCard(item, index, options));
      renderState.heights[column] += 300 / (item.width && item.height ? item.width / item.height : 1);
    }
    renderState.renderedCount = index + 1;
  }
  return renderState.renderedCount < items.length;
}

function setupControls(
  root: HTMLElement,
  items: GalleryItem[],
  galleryName: string,
  state: GalleryState,
  render: () => GalleryItem[],
) {
  const controlsRoot = root.querySelector<HTMLElement>('[data-gallery-controls-root]');
  if (!controlsRoot) return;
  controlsRoot.replaceChildren();
  controlsRoot.hidden = false;

  if (state.sortOptions.length > 1) {
    const control = createSelectionSwitch({
      id: `image-gallery-sort-${galleryName}`,
      ariaLabel: `Sort ${galleryName.replace(/[-_]+/g, ' ') || 'gallery'}`,
      options: state.sortOptions.map((value) => ({ value, label: SORT_LABELS[value] || value })),
      active: state.sort,
    });
    control.addEventListener('change', (event) => {
      state.sort = (event as CustomEvent).detail.value;
      render();
    });
    controlsRoot.appendChild(createControlGroup('Sort', control));
  }

  state.filterOptions.forEach((option) => {
    const label = filterLabel(option);
    const values = filterValues(items, option);
    if (values.length <= 1) return;
    values.sort(option === 'decade'
      ? (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
      : (a, b) => a.localeCompare(b));
    const config = {
      id: `image-gallery-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${galleryName}`,
      ariaLabel: `Filter by ${label.toLowerCase()}`,
      options: [
        { value: 'all', label: option === 'decade' ? 'All' : `All ${label.toLowerCase()}` },
        ...values.map((value) => ({ value, label: value })),
      ],
      active: state.filters[option] || 'all',
    };
    const control = option === 'decade'
      ? createSelectionSwitch(config)
      : createSelectionDropdown(config);
    control.addEventListener('change', (event) => {
      state.filters[option] = (event as CustomEvent).detail.value;
      render();
    });
    controlsRoot.appendChild(createControlGroup(label, control));
  });
}

export function createImageGalleryView(options: GalleryViewOptions) {
  const { root, grid, summary, sentinel, galleryName, items, state, config } = options;
  const renderOptions: RenderOptions = {
    showCaptions: config.showCaptions !== false,
    captionTitleFields: config.captionTitle ?? ['title'],
    captionBodyFields: config.captionBody ?? [],
    captionMetaFields: config.captionMeta ?? [],
    zoomTitleFields: config.zoomTitle ?? ['title'],
    zoomMetaFields: config.zoomMeta ?? [],
  };
  let visibleItems: GalleryItem[] = [];
  let observer: IntersectionObserver | null = null;
  let renderState: RenderState | null = null;

  const stopPagination = () => {
    observer?.disconnect();
    observer = null;
  };

  const observePagination = () => {
    stopPagination();
    if (!sentinel || !renderState || renderState.renderedCount >= visibleItems.length) return;
    observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      if (!appendPage(renderState!, visibleItems, state.pageSize, renderOptions)) stopPagination();
    }, { rootMargin: '800px 0px' });
    observer.observe(sentinel);
  };

  const render = () => {
    visibleItems = getVisibleItems(items, state);
    if (summary) {
      summary.hidden = false;
      summary.textContent = visibleItems.length === items.length
        ? `${items.length.toLocaleString()} works`
        : `${visibleItems.length.toLocaleString()} of ${items.length.toLocaleString()} works`;
    }
    grid.dataset.gallery = galleryName || 'image-gallery';
    const columns = [div('masonry-column'), div('masonry-column')];
    grid.replaceChildren(...columns);
    renderState = { columns, heights: [0, 0], renderedCount: 0 };
    appendPage(renderState, visibleItems, state.pageSize, renderOptions);
    observePagination();
    return visibleItems;
  };

  if (config.controls) setupControls(root, items, galleryName, state, render);

  return {
    render,
    get visibleItems() {
      return visibleItems;
    },
    renderedImages: () => new Map(
      [...grid.querySelectorAll<HTMLImageElement>('[data-gallery-item-id]')]
        .map((image) => [image.dataset.galleryItemId!, image]),
    ),
    zoomText: (item: GalleryItem) => ({
      title: formatFields(item, renderOptions.zoomTitleFields),
      meta: formatFields(item, renderOptions.zoomMetaFields),
    }),
    destroy: stopPagination,
  };
}

export type ImageGalleryView = ReturnType<typeof createImageGalleryView>;
