// Image Zoom — singleton viewer for standalone zoomable images and
// data-backed galleries. Navigation is a native scrolling surface with only
// the slides near the current one mounted; temporary clones exist only for
// the thumbnail-to-viewer opening and closing morphs.

import {
  createZoomImage,
  decodeImage,
  directCloseDuration,
  getContainedImageRect,
  IDENTITY_TRANSFORM,
  prefersReducedMotion,
  preloadImage,
  setFlipTransform,
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
  renderZoomSlides,
  resetZoomShareFeedback,
  revealInLockedPage,
  setZoomShareFeedback,
  updateZoomMeta,
  updateZoomNavigation,
  updateZoomPalette,
  zoomSlideWidth,
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
  // Finds (or renders) the page image for an item the viewer navigated to,
  // so closing can morph back into it.
  resolveElement?: (item: ZoomGalleryItem, index: number) => HTMLImageElement | null;
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
  // Where keyboard/button navigation is headed while its smooth scroll runs,
  // so repeated presses step from the destination, not mid-animation.
  navTarget: number | null;
  options: ZoomGalleryOptions;
  directEntrance: boolean;
  previousFocus: HTMLElement | null;
  phase: ZoomPhase;
  view: ZoomView | null;
  clonedImage: HTMLImageElement | null;
  // Set once the opening morph is running; cleared when it hands off.
  openTimer: number | null;
  hiddenOrigin: HTMLElement | null;
  shareFeedbackTimer: number | null;
}

let activeSession: ZoomSession | null = null;

// Slides mounted (and loaded) on each side of the current one.
const SLIDE_RADIUS = 1;
const ORIGIN_LOAD_WAIT = 400;
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
  const image = session.view?.slides.get(index);
  if (!item || !image) return null;

  if (!image.getAttribute('src')) {
    allowPixelReads(image, item.thumbSrc);
    image.src = item.thumbSrc;
    await decodeImage(image);
    upgradeViewerImage(session, index);
  } else if (!image.complete || image.naturalWidth === 0) {
    // Loaded images skip decode(): on an upgraded original it re-decodes,
    // which can take seconds.
    await decodeImage(image);
  }
  return activeSession === session && image.isConnected ? image : null;
}

// Swaps a mounted slide to its full-size source, but only once the opening
// morph has ended: decoding a large original mid-animation stutters it.
function upgradeViewerImage(session: ZoomSession, index: number) {
  const item = session.items[index];
  const image = session.view?.slides.get(index);
  if (activeSession !== session || !item || !image || session.phase !== 'open') return;
  if ('zoomUpgrade' in image.dataset) return;
  image.dataset.zoomUpgrade = '';
  upgradeImageSource(image, item, () => activeSession === session && image.isConnected);
}

function syncSlides(session: ZoomSession) {
  if (!session.view) return;
  const current = session.currentIndex;
  const target = session.navTarget ?? current;
  // Mount around the current slide and the destination only. A smooth scroll
  // crosses unmounted slides, and the scroll handler mounts them as it passes.
  const indices = new Set<number>();
  for (let offset = -SLIDE_RADIUS; offset <= SLIDE_RADIUS; offset += 1) {
    indices.add(current + offset);
    indices.add(target + offset);
  }
  renderZoomSlides(session.view, indices);
  session.view.slides.forEach((_, index) => {
    if (Math.abs(index - current) <= SLIDE_RADIUS || index === target) {
      void loadViewerImage(session, index);
    }
  });
}

function hideOrigin(session: ZoomSession, element: HTMLElement | null) {
  if (session.hiddenOrigin === element) return;
  if (session.hiddenOrigin) session.hiddenOrigin.style.visibility = '';
  session.hiddenOrigin = element;
  if (element) element.style.visibility = 'hidden';
}

function setCurrentIndex(session: ZoomSession, index: number, notify = true) {
  const safeIndex = Math.max(0, Math.min(index, session.items.length - 1));
  if (safeIndex === session.currentIndex) return;
  session.currentIndex = safeIndex;
  if (session.navTarget === safeIndex) session.navTarget = null;
  const item = currentItem(session);
  if (!item || !session.view) return;
  updateZoomNavigation(session.view, safeIndex, session.items.length);
  updateZoomMeta(session.view, item);
  resetZoomShareFeedback(session.view);
  syncSlides(session);
  void loadViewerImage(session, safeIndex).then((image) => {
    if (image && activeSession === session && session.currentIndex === safeIndex && session.view) {
      updateZoomPalette(session.view, paletteForImage(item, image));
    }
  });
  if (notify) session.options.onChange?.(item, safeIndex);
}

function nearestScrollIndex(session: ZoomSession): number {
  if (!session.view) return session.currentIndex;
  const width = zoomSlideWidth(session.view);
  if (width === 0) return session.currentIndex;
  return Math.max(
    0,
    Math.min(Math.round(session.view.viewport.scrollLeft / width), session.items.length - 1),
  );
}

function handleScroll(session: ZoomSession) {
  if (session.phase !== 'open') return;
  setCurrentIndex(session, nearestScrollIndex(session));
}

function navigate(session: ZoomSession, direction: number) {
  if (activeSession !== session || session.phase !== 'open' || !session.view) return;
  const from = session.navTarget ?? nearestScrollIndex(session);
  const target = Math.max(0, Math.min(from + direction, session.items.length - 1));
  session.navTarget = target === session.currentIndex ? null : target;
  // Mount the destination first: a programmatic scroll only snaps to slides
  // that exist when it starts.
  syncSlides(session);
  session.view.viewport.scrollTo({
    left: target * zoomSlideWidth(session.view),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

function handleResize(session: ZoomSession) {
  requestSessionFrame(session, () => {
    if (activeSession !== session || !session.view) return;
    retargetOpening(session);
    // Snapping back cancels any in-flight smooth scroll.
    session.navTarget = null;
    session.view.viewport.scrollLeft = session.currentIndex * zoomSlideWidth(session.view);
  });
}

function handleOverlayClick(session: ZoomSession, event: MouseEvent) {
  if (session.phase !== 'open' || !session.view) return;
  const slide = (event.target as Element | null)?.closest<HTMLElement>('.image-zoom-slide');
  if (Number(slide?.dataset.zoomIndex) !== session.currentIndex) return;
  const item = currentItem(session);
  const image = session.view.slides.get(session.currentIndex);
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
  // Direct input takes over from any pending button/keyboard destination.
  const dropNavTarget = () => { session.navTarget = null; };
  ['pointerdown', 'wheel', 'touchstart'].forEach((type) => {
    session.view!.viewport.addEventListener(type, dropNavTarget, { passive: true, signal });
  });
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
    navTarget: null,
    options,
    directEntrance: options.direct === true || !selected.element?.isConnected,
    previousFocus: options.returnFocus || document.activeElement as HTMLElement | null,
    phase: 'opening',
    view: null,
    clonedImage: null,
    openTimer: null,
    hiddenOrigin: null,
    shareFeedbackTimer: null,
  };
  activeSession = session;

  if (session.directEntrance) {
    await preloadImage(selected.thumbSrc);
    if (activeSession !== session) return false;
  }

  const origin = session.directEntrance ? null : selected.element ?? null;
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
  syncSlides(session);
  session.view.viewport.scrollLeft = safeIndex * zoomSlideWidth(session.view);

  const viewerImage = await loadViewerImage(session, safeIndex);
  if (!viewerImage || activeSession !== session || !session.view) return false;

  // Laid out at its final rect and transformed back onto the thumbnail.
  const target = getContainedImageRect(selected, viewerImage);
  const clone = await createClone(session, selected, target);
  if (!clone || activeSession !== session || !session.view) return false;
  session.clonedImage = clone;
  updateZoomPalette(session.view, paletteForImage(selected, clone));
  updateZoomNavigation(session.view, safeIndex, session.items.length);
  updateZoomMeta(session.view, selected);

  if (session.directEntrance || !originalRect) {
    clone.classList.add('image-zoom-clone--direct');
  } else {
    setFlipTransform(clone, target, originalRect);
  }

  void clone.offsetHeight;
  clone.style.transition = '';
  if (!await waitForSessionFrame(session)) return false;
  hideOrigin(session, origin);

  requestSessionFrame(session, () => {
    if (session.phase !== 'opening' || !session.view || !session.clonedImage) return;
    session.view.backdrop.classList.add('active');
    session.view.controls.classList.add('active');
    if (!session.directEntrance) session.clonedImage.style.transform = IDENTITY_TRANSFORM;
    session.clonedImage.classList.add('zoomed');
    (options.direct ? session.view.overlay : session.view.closeButton).focus({ preventScroll: true });
    scheduleFinishOpening(session);
  });

  return true;
}

function scheduleFinishOpening(session: ZoomSession) {
  clearTimer(session.openTimer);
  session.openTimer = setSessionTimer(session, () => finishOpening(session), transitionDuration());
}

function finishOpening(session: ZoomSession) {
  if (session.phase !== 'opening' || !session.view) return;
  session.openTimer = null;
  session.view.viewport.classList.add('active');
  session.clonedImage?.remove();
  session.clonedImage = null;
  session.phase = 'open';
  session.view.slides.forEach((_, index) => upgradeViewerImage(session, index));
}

// A viewport resize mid-open (window resize, rotation) moves the viewer
// image. Continue the morph from the clone's current spot to the new
// one instead of jumping at the handoff.
function retargetOpening(session: ZoomSession) {
  const clone = session.clonedImage;
  const item = currentItem(session);
  const image = session.view?.slides.get(session.currentIndex);
  if (session.phase !== 'opening' || !clone || !item || !image) return;
  const target = getContainedImageRect(item, image);
  const unchanged = (['top', 'left', 'width', 'height'] as const)
    .every((side) => Math.abs(target[side] - parseFloat(clone.style[side])) < 1);
  if (unchanged) return;
  const box = clone.getBoundingClientRect();

  clone.style.transition = 'none';
  setZoomRect(clone, target);
  if (!session.directEntrance) setFlipTransform(clone, target, box);
  void clone.offsetHeight;
  clone.style.transition = '';
  if (session.openTimer === null) return; // not started: the start frame animates it
  if (!session.directEntrance) clone.style.transform = IDENTITY_TRANSFORM;
  scheduleFinishOpening(session);
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
  const origin = session.hiddenOrigin?.isConnected ? session.hiddenOrigin : null;
  hideOrigin(session, null);
  session.controller.abort();
  session.clonedImage?.remove();
  if (session.view) destroyZoomView(session.view);

  const focusTarget = origin || session.options.returnFocus || session.previousFocus;
  const onClosed = session.options.onClosed;
  if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  onClosed?.();
}

function closeOrigin(session: ZoomSession, item: ZoomGalleryItem): HTMLImageElement | null {
  if (session.directEntrance) return null;
  const element = item.element?.isConnected
    ? item.element
    : session.options.resolveElement?.(item, session.currentIndex);
  return element?.isConnected ? element : null;
}

// A card rendered for this close may not have loaded its thumbnail yet; give
// it a moment so the morph doesn't land on an empty skeleton.
async function waitForOrigin(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0) return;
  image.loading = 'eager';
  await Promise.race([
    decodeImage(image),
    new Promise((resolve) => window.setTimeout(resolve, ORIGIN_LOAD_WAIT)),
  ]);
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

  // The thumbnail, not the upgraded original: the clone shrinks away at once,
  // and decoding a large original first would stall the close.
  const cloneItem = { ...selected, fullSrc: undefined };
  const cloneBox = getContainedImageRect(selected, viewerImage);
  const clone = await createClone(session, cloneItem, cloneBox);
  if (!clone || activeSession !== session || !session.view) return;
  // Closing mid-open: the opening clone is still mounted.
  session.clonedImage?.remove();
  session.clonedImage = clone;
  clone.classList.add('zoomed');
  session.view.viewport.classList.remove('active');
  void clone.offsetHeight;
  clone.style.transition = '';
  if (!await waitForSessionFrame(session) || !session.view) return;

  const origin = closeOrigin(session, selected);
  if (origin) {
    await revealInLockedPage(origin);
    await waitForOrigin(origin);
    if (activeSession !== session || !session.view) return;
    hideOrigin(session, origin);
    setFlipTransform(clone, cloneBox, origin.getBoundingClientRect());
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
