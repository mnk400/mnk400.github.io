const IMAGE_QUERY_PARAM = 'image';
const GALLERY_HISTORY_KEY = '__imageGallery';

let activePopStateHandler: ((event: PopStateEvent) => boolean) | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    if (!activePopStateHandler?.(event)) return;
    event.stopImmediatePropagation();
  }, true);
}

interface ImageGalleryRouteOptions {
  galleryName: string;
  isOpen(): boolean;
  hasItem(id: string): boolean;
  openDirect(id: string): Promise<void>;
  close(): void;
  setPending(pending: boolean): void;
  onMissing(): void;
}

export function requestedImageId(): string {
  return new URLSearchParams(window.location.search).get(IMAGE_QUERY_PARAM) || '';
}

function writeImageUrl(galleryName: string, id = '', mode: 'push' | 'replace' = 'replace') {
  const url = new URL(window.location.href);
  const state: Record<string, unknown> = window.history.state
    && typeof window.history.state === 'object'
    ? { ...window.history.state }
    : {};
  if (id) {
    url.searchParams.set(IMAGE_QUERY_PARAM, id);
    state[GALLERY_HISTORY_KEY] = galleryName;
  } else {
    url.searchParams.delete(IMAGE_QUERY_PARAM);
    delete state[GALLERY_HISTORY_KEY];
  }
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url);
}

function ownsCurrentEntry(galleryName: string): boolean {
  return window.history.state?.[GALLERY_HISTORY_KEY] === galleryName;
}

export function createImageGalleryRoute(
  options: ImageGalleryRouteOptions,
) {
  let syncRevision = 0;

  const sync = async () => {
    if (activePopStateHandler !== onPopState) return;
    const revision = ++syncRevision;
    const id = requestedImageId();

    if (!id) {
      options.setPending(false);
      if (options.isOpen()) options.close();
      return;
    }
    if (options.isOpen()) return;

    if (!options.hasItem(id)) {
      options.setPending(false);
      writeImageUrl(options.galleryName);
      options.onMissing();
      return;
    }

    // Give shared URLs a synthetic base entry so Back dismisses the viewer
    // in place instead of handing the query change to Astro's page router.
    if (!ownsCurrentEntry(options.galleryName)) {
      writeImageUrl(options.galleryName);
      writeImageUrl(options.galleryName, id, 'push');
    }

    options.setPending(true);
    await options.openDirect(id);
    if (activePopStateHandler === onPopState && revision === syncRevision) {
      options.setPending(false);
    }
  };

  const onPopState = (event: PopStateEvent) => {
    const belongsToGallery = options.isOpen()
      || (requestedImageId() && event.state?.[GALLERY_HISTORY_KEY] === options.galleryName);
    if (!belongsToGallery) return false;
    void sync();
    return true;
  };

  activePopStateHandler = onPopState;

  return {
    push: (id: string) => writeImageUrl(options.galleryName, id, 'push'),
    replace: (id: string) => writeImageUrl(options.galleryName, id),
    requestClose: () => {
      if (ownsCurrentEntry(options.galleryName)) {
        window.history.back();
      } else {
        writeImageUrl(options.galleryName);
        options.close();
      }
      return true;
    },
    closed: () => {
      if (activePopStateHandler === onPopState && requestedImageId()) {
        requestAnimationFrame(() => {
          if (activePopStateHandler === onPopState) void sync();
        });
      }
    },
    sync,
    destroy: () => {
      syncRevision += 1;
      if (activePopStateHandler === onPopState) activePopStateHandler = null;
    },
  };
}

export type ImageGalleryRoute = ReturnType<typeof createImageGalleryRoute>;
