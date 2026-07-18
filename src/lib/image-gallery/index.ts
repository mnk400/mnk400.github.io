import {
  closeZoom,
  openZoomGallery,
  type ZoomGalleryItem,
} from '../image-zoom/index.ts';
import {
  createGalleryState,
  normalizeGalleryItems,
  sortItems,
  type GalleryItem,
  type GalleryManifest,
  type ImageGalleryConfig,
} from './data.ts';
import {
  createImageGalleryRoute,
  requestedImageId,
  type ImageGalleryRoute,
} from './route.ts';
import {
  createImageGalleryView,
  type ImageGalleryView,
} from './view.ts';

export type { ImageGalleryConfig } from './data.ts';

type GalleryRoot = HTMLElement;

const activeGalleryCleanups = new Set<() => void>();

function readConfig(root: GalleryRoot): ImageGalleryConfig | null {
  const config = root.querySelector<HTMLScriptElement>('[data-image-gallery-config]');
  return config?.textContent ? JSON.parse(config.textContent) as ImageGalleryConfig : null;
}

function zoomItemsFor(items: GalleryItem[], view: ImageGalleryView): ZoomGalleryItem[] {
  const renderedImages = view.renderedImages();
  return items.map((item) => ({
    id: item.id,
    thumbSrc: item.thumb,
    fullSrc: item.full,
    alt: item.alt,
    ...view.zoomText(item),
    width: item.width,
    height: item.height,
    element: renderedImages.get(item.id) || null,
  }));
}

export async function loadImageGallery(root: GalleryRoot, config: ImageGalleryConfig) {
  const { source, galleryName } = config;
  const grid = root.querySelector<HTMLElement>('[data-gallery-grid]');
  const status = root.querySelector<HTMLElement>('[data-gallery-status]');
  const summary = root.querySelector<HTMLElement>('[data-gallery-summary]');
  const sentinel = root.querySelector<HTMLElement>('[data-gallery-sentinel]');
  const requestedImageOnLoad = requestedImageId();
  const controller = new AbortController();
  const { signal } = controller;
  let statusTimer: number | null = null;
  let lightboxOpen = false;
  let imageRoute: ImageGalleryRoute | null = null;
  let view: ImageGalleryView | null = null;

  const cleanup = () => {
    if (signal.aborted) return;
    controller.abort();
    view?.destroy();
    imageRoute?.destroy();
    if (statusTimer !== null) window.clearTimeout(statusTimer);
    if (lightboxOpen) closeZoom({ skipRequest: true, immediate: true });
    root.setAttribute('aria-busy', 'false');
    activeGalleryCleanups.delete(cleanup);
  };
  activeGalleryCleanups.add(cleanup);
  root.setAttribute('aria-busy', 'true');

  if (!source || !grid) {
    cleanup();
    return;
  }

  if (requestedImageOnLoad) {
    root.classList.add('is-deep-link-pending');
    if (status) {
      status.hidden = false;
      status.textContent = 'Loading image…';
    }
  } else if (status) {
    statusTimer = window.setTimeout(() => {
      status.hidden = false;
    }, 500);
  }

  try {
    const response = await fetch(source, { signal });
    if (!response.ok) throw new Error(`Failed to fetch gallery manifest: ${response.status}`);

    const manifest = await response.json() as GalleryManifest;
    const items = normalizeGalleryItems(manifest, config.baseUrl);
    const state = createGalleryState(config, root.dataset.searchQuery);
    view = createImageGalleryView({
      root,
      grid,
      summary,
      sentinel,
      galleryName,
      items,
      state,
      config,
    });

    if (statusTimer !== null) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }
    if (status && !requestedImageOnLoad) status.hidden = true;

    root.addEventListener('site-search:change', (event) => {
      state.query = (event as CustomEvent).detail?.query || '';
      const visibleItems = view!.render();
      root.dispatchEvent(new CustomEvent('image-gallery:filtered', {
        detail: { items, visibleItems, query: state.query },
      }));
    }, { signal });

    const visibleItems = view.render();
    root.classList.add('is-ready');
    root.dispatchEvent(new CustomEvent('image-gallery:loaded', {
      detail: { manifest, items, visibleItems },
    }));
    if (!root.hasAttribute('tabindex')) root.tabIndex = -1;

    const openItem = async (
      id: string,
      direct: boolean,
      returnFocus: HTMLElement | null,
      navigationItems: GalleryItem[],
    ) => {
      const index = navigationItems.findIndex((item) => item.id === id);
      if (index < 0 || lightboxOpen || !view) return;
      lightboxOpen = true;
      const opened = await openZoomGallery(zoomItemsFor(navigationItems, view), index, {
        direct,
        share: true,
        returnFocus,
        onChange: (item) => imageRoute?.replace(item.id),
        onRequestClose: () => imageRoute?.requestClose() ?? false,
        onClosed: () => {
          lightboxOpen = false;
          imageRoute?.closed();
        },
      });
      if (!opened) lightboxOpen = false;
      if (signal.aborted) closeZoom({ skipRequest: true, immediate: true });
    };

    const setDeepLinkPending = (pending: boolean) => {
      root.classList.toggle('is-deep-link-pending', pending);
      if (!status) return;
      status.hidden = !pending;
      if (pending) status.textContent = 'Loading image…';
    };

    imageRoute = createImageGalleryRoute({
      galleryName,
      isOpen: () => lightboxOpen,
      hasItem: (id) => items.some((item) => item.id === id),
      openDirect: async (id) => {
        if (!view) return;
        const navigationItems = view.visibleItems.some((item) => item.id === id)
          ? view.visibleItems
          : sortItems(items, state.sort);
        await openItem(id, true, root, navigationItems);
      },
      close: () => closeZoom({ skipRequest: true }),
      setPending: setDeepLinkPending,
      onMissing: () => {
        if (!status) return;
        status.hidden = false;
        status.textContent = 'This image is no longer available.';
        statusTimer = window.setTimeout(() => {
          status.hidden = true;
          statusTimer = null;
        }, 5000);
      },
    });

    const onGalleryActivate = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      const image = (event.target as HTMLElement | null)
        ?.closest<HTMLImageElement>('[data-gallery-item-id]');
      const id = image?.dataset.galleryItemId;
      if (!image || !id || !grid.contains(image) || !view) return;
      event.preventDefault();
      event.stopPropagation();
      imageRoute?.push(id);
      void openItem(id, false, image, view.visibleItems);
    };

    root.addEventListener('click', onGalleryActivate, { signal });
    root.addEventListener('keydown', onGalleryActivate, { signal });
    await imageRoute.sync();
    root.setAttribute('aria-busy', 'false');
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
    console.error('Error loading image gallery:', error);
    root.classList.remove('is-deep-link-pending');
    root.setAttribute('aria-busy', 'false');
    if (statusTimer !== null) window.clearTimeout(statusTimer);
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

export function destroyImageGalleries() {
  [...activeGalleryCleanups].forEach((cleanup) => cleanup());
}

document.addEventListener('astro:before-swap', destroyImageGalleries);
