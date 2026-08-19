// Image Zoom — singleton viewer for standalone zoomable images and
// data-backed galleries. Navigation is a native scrolling surface; temporary
// clones exist only for the thumbnail-to-viewer opening and closing morphs.

import {
  createZoomImage,
  decodeImage,
  directCloseDuration,
  getContainedImageRect,
  prefersReducedMotion,
  preloadImage,
  setZoomRect,
  transitionDuration,
  upgradeImageSource,
  waitForAnimationFrame,
  type ZoomRect,
} from './motion.ts';
import { allowPixelReads } from '../images.ts';
import { extractPalette, type PaletteColor } from '../color-palette.ts';
import {
  createZoomView,
  destroyZoomView,
  resetZoomShareFeedback,
  setZoomShareFeedback,
  updateZoomMeta,
  updateZoomNavigation,
  updateZoomPalette,
  type ZoomView,
} from './view.ts';

export interface ZoomGalleryItem {
  id: string;
  thumbSrc: string;
  fullSrc?: string;
  alt?: string;
  title?: string;
  meta?: string;
  width?: number | null;
  height?: number | null;
  element?: HTMLImageElement | null;
}

export interface ZoomGalleryOptions {
  direct?: boolean;
  share?: boolean;
  returnFocus?: HTMLElement | null;
  onChange?: (item: ZoomGalleryItem, index: number) => void;
  onRequestClose?: () => boolean | void;
  onClosed?: () => void;
}

interface CloseZoomOptions {
  skipRequest?: boolean;
  immediate?: boolean;
}

type ZoomPhase = 'opening' | 'open' | 'closing';

interface ZoomSession {
  controller: AbortController;
  items: ZoomGalleryItem[];
  currentIndex: number;
  options: ZoomGalleryOptions;
  directEntrance: boolean;
  previousFocus: HTMLElement | null;
  phase: ZoomPhase;
  view: ZoomView | null;
  clonedImage: HTMLImageElement | null;
  shareFeedbackTimer: number | null;
}

let activeSession: ZoomSession | null = null;

const PALETTE_DOTS = 4;
const PALETTE_SAMPLE_SIZE = 64;
const PALETTE_CACHE_LIMIT = 120;

// Keyed by thumbnail URL, item ids are only unique within one manifest.
const paletteCache = new Map<string, PaletteColor[]>();

function paletteForImage(item: ZoomGalleryItem, image: HTMLImageElement): PaletteColor[] {
  const cached = paletteCache.get(item.thumbSrc);
  if (cached) return cached;

  const colors = extractPalette(image, {
    count: PALETTE_DOTS,
    sampleSize: PALETTE_SAMPLE_SIZE,
  });
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) {
    const oldest = paletteCache.keys().next();
    if (!oldest.done) paletteCache.delete(oldest.value);
  }
  paletteCache.set(item.thumbSrc, colors);
  return colors;
}

function setSessionTimer(session: ZoomSession, callback: () => void, delay: number): number {
  return window.setTimeout(() => {
    if (activeSession === session) callback();
  }, delay);
}

function clearTimer(timer: number | null) {
  if (timer !== null) window.clearTimeout(timer);
}

function requestSessionFrame(session: ZoomSession, callback: () => void) {
  window.requestAnimationFrame(() => {
    if (activeSession === session) callback();
  });
}

async function waitForSessionFrame(session: ZoomSession): Promise<boolean> {
  await waitForAnimationFrame();
  return activeSession === session;
}

function itemForImage(img: HTMLImageElement): ZoomGalleryItem {
  return {
    id: img.dataset.galleryItemId || img.currentSrc || img.src,
    thumbSrc: img.currentSrc || img.src,
    fullSrc: img.dataset.fullSrc || img.currentSrc || img.src,
    alt: img.alt,
    title: img.dataset.title || '',
    meta: img.dataset.meta || '',
    width: img.naturalWidth || img.width || null,
    height: img.naturalHeight || img.height || null,
    element: img,
  };
}

function findSiblingImages(img: HTMLImageElement): HTMLImageElement[] {
  const container = img.closest('[data-gallery]');
  if (!container) return [img];
  const siblings = Array.from(container.querySelectorAll<HTMLImageElement>('[data-zoomable]'));
  if (siblings.every((element) => element.dataset.galleryIndex !== undefined)) {
    siblings.sort((a, b) => Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex));
  }
  return siblings;
}

function currentItem(session: ZoomSession): ZoomGalleryItem | null {
  return session.items[session.currentIndex] || null;
}

async function createClone(
  session: ZoomSession,
  item: ZoomGalleryItem,
  initialRect?: ZoomRect,
): Promise<HTMLImageElement | null> {
  if (!session.view) return null;
  const clone = createZoomImage(item, initialRect);
  await decodeImage(clone);
  if (activeSession !== session) return null;
  session.view.overlay.appendChild(clone);
  return clone;
}

async function loadViewerImage(
  session: ZoomSession,
  index: number,
): Promise<HTMLImageElement | null> {
  const item = session.items[index];
  const image = session.view?.images[index];
  if (!item || !image) return null;

  if (!image.getAttribute('src')) {
    allowPixelReads(image, item.thumbSrc);
    image.src = item.thumbSrc;
  }
  await decodeImage(image);
  if (activeSession !== session) return null;
  upgradeImageSource(image, item, () => activeSession === session && image.hasAttribute('src'));
  return image;
}

function loadAround(session: ZoomSession, index: number) {
  session.view?.images.forEach((image, itemIndex) => {
    if (Math.abs(itemIndex - index) <= 1) void loadViewerImage(session, itemIndex);
    else image.removeAttribute('src');
  });
}

function setCurrentIndex(session: ZoomSession, index: number, notify = true) {
  const safeIndex = Math.max(0, Math.min(index, session.items.length - 1));
  if (safeIndex === session.currentIndex) return;
  const previous = currentItem(session);
  if (previous?.element?.isConnected) previous.element.style.visibility = '';

  session.currentIndex = safeIndex;
  const item = currentItem(session);
  if (!item || !session.view) return;
  if (item.element?.isConnected) item.element.style.visibility = 'hidden';
  updateZoomNavigation(session.view, safeIndex, session.items.length);
  updateZoomMeta(session.view, item);
  resetZoomShareFeedback(session.view);
  loadAround(session, safeIndex);
  void loadViewerImage(session, safeIndex).then((image) => {
    if (image && activeSession === session && session.currentIndex === safeIndex && session.view) {
      updateZoomPalette(session.view, paletteForImage(item, image));
    }
  });
  if (notify) session.options.onChange?.(item, safeIndex);
}

function nearestScrollIndex(session: ZoomSession): number {
  const viewport = session.view?.viewport;
  if (!viewport || viewport.clientWidth === 0) return session.currentIndex;
  return Math.max(
    0,
    Math.min(Math.round(viewport.scrollLeft / viewport.clientWidth), session.items.length - 1),
  );
}

function handleScroll(session: ZoomSession) {
  if (session.phase !== 'open') return;
  setCurrentIndex(session, nearestScrollIndex(session));
}

function scrollToIndex(session: ZoomSession, index: number) {
  const viewport = session.view?.viewport;
  if (!viewport) return;
  const safeIndex = Math.max(0, Math.min(index, session.items.length - 1));
  viewport.scrollTo({
    left: safeIndex * viewport.clientWidth,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

function navigate(session: ZoomSession, direction: number) {
  if (activeSession !== session || session.phase !== 'open') return;
  scrollToIndex(session, nearestScrollIndex(session) + direction);
}

function handleResize(session: ZoomSession) {
  requestSessionFrame(session, () => {
    if (activeSession !== session || !session.view) return;
    session.view.viewport.scrollLeft = session.currentIndex * session.view.viewport.clientWidth;
  });
}

function handleOverlayClick(session: ZoomSession, event: MouseEvent) {
  if (session.phase !== 'open' || !session.view) return;
  const slide = (event.target as Element | null)?.closest<HTMLElement>('.image-zoom-slide');
  if (Number(slide?.dataset.zoomIndex) !== session.currentIndex) return;
  const item = currentItem(session);
  const image = session.view.images[session.currentIndex];
  if (!item || !image) return;
  const rect = getContainedImageRect(item, image);
  const outsideImage = event.clientX < rect.left || event.clientX > rect.left + rect.width
    || event.clientY < rect.top || event.clientY > rect.top + rect.height;
  if (outsideImage) requestSessionFrame(session, () => closeZoom());
}

async function copyCurrentLink(session: ZoomSession) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
  } catch {}

  if (activeSession !== session || !session.view) return;
  setZoomShareFeedback(session.view, copied);
  clearTimer(session.shareFeedbackTimer);
  session.shareFeedbackTimer = setSessionTimer(session, () => {
    if (session.view) resetZoomShareFeedback(session.view);
    session.shareFeedbackTimer = null;
  }, 1600);
}

function attachInteractionListeners(session: ZoomSession) {
  if (!session.view) return;
  const { signal } = session.controller;
  document.addEventListener('keydown', handleKeyDown, { signal });
  session.view.viewport.addEventListener('scroll', () => handleScroll(session), {
    passive: true,
    signal,
  });
  window.addEventListener('resize', () => handleResize(session), { signal });
}

export async function openZoomGallery(
  galleryItems: ZoomGalleryItem[],
  initialIndex: number,
  options: ZoomGalleryOptions = {},
) {
  if (activeSession || galleryItems.length === 0) return false;
  const safeIndex = Math.max(0, Math.min(initialIndex, galleryItems.length - 1));
  const selected = galleryItems[safeIndex];
  if (!selected?.thumbSrc) return false;

  const session: ZoomSession = {
    controller: new AbortController(),
    items: galleryItems,
    currentIndex: safeIndex,
    options,
    directEntrance: options.direct === true || !selected.element?.isConnected,
    previousFocus: options.returnFocus || document.activeElement as HTMLElement | null,
    phase: 'opening',
    view: null,
    clonedImage: null,
    shareFeedbackTimer: null,
  };
  activeSession = session;

  if (session.directEntrance) {
    await preloadImage(selected.thumbSrc);
    if (activeSession !== session) return false;
  }

  const origin = session.directEntrance ? null : selected.element;
  const originalRect = origin?.getBoundingClientRect();
  session.view = createZoomView({
    direct: session.directEntrance,
    multi: session.items.length > 1,
    share: options.share === true,
    items: session.items,
    signal: session.controller.signal,
    onClose: () => closeZoom(),
    onBackdrop: () => requestSessionFrame(session, () => closeZoom()),
    onOverlayClick: (event) => handleOverlayClick(session, event),
    onPrevious: () => navigate(session, -1),
    onNext: () => navigate(session, 1),
    onShare: () => void copyCurrentLink(session),
  });
  attachInteractionListeners(session);
  session.view.viewport.scrollLeft = safeIndex * session.view.viewport.clientWidth;

  const viewerImage = await loadViewerImage(session, safeIndex);
  if (!viewerImage || activeSession !== session || !session.view) return false;
  loadAround(session, safeIndex);

  const clone = await createClone(session, selected, originalRect);
  if (!clone || activeSession !== session || !session.view) return false;
  session.clonedImage = clone;
  updateZoomPalette(session.view, paletteForImage(selected, clone));
  updateZoomNavigation(session.view, safeIndex, session.items.length);
  updateZoomMeta(session.view, selected);
  upgradeImageSource(clone, selected, () => activeSession === session);
  const target = getContainedImageRect(selected, viewerImage);

  if (session.directEntrance) {
    setZoomRect(clone, target);
    clone.classList.add('image-zoom-clone--direct');
  }

  void clone.offsetHeight;
  clone.style.transition = '';
  if (!await waitForSessionFrame(session)) return false;
  if (origin) origin.style.visibility = 'hidden';

  requestSessionFrame(session, () => {
    if (session.phase !== 'opening' || !session.view || !session.clonedImage) return;
    session.view.backdrop.classList.add('active');
    session.view.controls.classList.add('active');
    setZoomRect(session.clonedImage, target);
    session.clonedImage.classList.add('zoomed');
    (options.direct ? session.view.overlay : session.view.closeButton).focus({ preventScroll: true });
    setSessionTimer(session, () => {
      if (session.phase !== 'opening' || !session.view) return;
      session.view.viewport.classList.add('active');
      session.clonedImage?.remove();
      session.clonedImage = null;
      session.phase = 'open';
    }, transitionDuration());
  });

  return true;
}

export function openZoom(img: HTMLImageElement) {
  const galleryItems = findSiblingImages(img).map(itemForImage);
  const index = Math.max(0, galleryItems.findIndex((item) => item.element === img));
  return openZoomGallery(galleryItems, index, { returnFocus: img });
}

function finishClose(session: ZoomSession) {
  if (activeSession !== session) return;
  activeSession = null;
  clearTimer(session.shareFeedbackTimer);
  session.items.forEach((item) => {
    if (item.element?.isConnected) item.element.style.visibility = '';
  });
  session.controller.abort();
  session.clonedImage?.remove();
  if (session.view) destroyZoomView(session.view);

  const focusTarget = session.options.returnFocus || session.previousFocus;
  const onClosed = session.options.onClosed;
  if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  onClosed?.();
}

async function closeSession(session: ZoomSession, options: CloseZoomOptions) {
  if (session.phase === 'closing') {
    if (options.immediate) finishClose(session);
    return;
  }
  if (!options.skipRequest && session.options.onRequestClose?.() === true) return;
  if (options.immediate || !session.view) {
    finishClose(session);
    return;
  }

  if (session.phase === 'open') setCurrentIndex(session, nearestScrollIndex(session));
  session.phase = 'closing';
  const selected = currentItem(session);
  const viewerImage = selected
    ? await loadViewerImage(session, session.currentIndex)
    : null;
  if (!selected || !viewerImage || activeSession !== session || !session.view) {
    finishClose(session);
    return;
  }

  const cloneItem = {
    ...selected,
    thumbSrc: viewerImage.currentSrc || selected.thumbSrc,
    fullSrc: undefined,
  };
  const clone = await createClone(
    session,
    cloneItem,
    getContainedImageRect(selected, viewerImage),
  );
  if (!clone || activeSession !== session || !session.view) return;
  session.clonedImage = clone;
  clone.classList.add('zoomed');
  session.view.viewport.classList.remove('active');
  void clone.offsetHeight;
  clone.style.transition = '';
  if (!await waitForSessionFrame(session) || !session.view) return;

  const origin = !session.directEntrance && selected.element?.isConnected
    ? selected.element
    : null;
  if (origin) {
    origin.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
    setZoomRect(clone, origin.getBoundingClientRect());
    clone.classList.remove('zoomed');
    session.view.backdrop.classList.remove('active');
    session.view.controls.classList.remove('active');
    setSessionTimer(session, () => finishClose(session), transitionDuration());
  } else {
    session.view.overlay.classList.add('image-zoom-overlay--closing-direct');
    setSessionTimer(session, () => finishClose(session), directCloseDuration());
  }
}

export function closeZoom(options: CloseZoomOptions = {}) {
  const session = activeSession;
  if (session) void closeSession(session, options);
}

function handleKeyDown(event: KeyboardEvent) {
  const session = activeSession;
  if (!session) return;
  if (event.key === 'ArrowLeft') navigate(session, -1);
  else if (event.key === 'ArrowRight') navigate(session, 1);
}

function handleImageActivation(event: MouseEvent | KeyboardEvent) {
  if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
  const img = (event.target as HTMLElement | null)?.closest<HTMLImageElement>('[data-zoomable]');
  if (!img || img.tagName !== 'IMG') return;
  event.preventDefault();
  event.stopPropagation();
  void openZoom(img);
}

function decorateZoomableImages(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>('img[data-zoomable]').forEach((image) => {
    if (!image.hasAttribute('tabindex')) image.tabIndex = 0;
    if (!image.hasAttribute('role')) image.setAttribute('role', 'button');
    if (!image.hasAttribute('aria-label')) image.setAttribute('aria-label', `Open ${image.alt || 'image'}`);
  });
}

document.addEventListener('click', handleImageActivation);
document.addEventListener('keydown', handleImageActivation);
document.addEventListener('astro:page-load', () => decorateZoomableImages());
document.addEventListener('astro:before-swap', () => {
  closeZoom({ skipRequest: true, immediate: true });
});
decorateZoomableImages();
