// Image Zoom — singleton lightbox controller for standalone zoomable images
// and data-backed galleries. Gallery sessions navigate the complete item list,
// even when incremental rendering means most thumbnails are not in the DOM.

import {
  computeZoomTarget,
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
import {
  createZoomView,
  resetZoomShareFeedback,
  setZoomShareFeedback,
  updateZoomMeta,
  updateZoomNavigation,
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

type ZoomPhase = 'opening' | 'open' | 'navigating' | 'closing';

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
  inertTarget: HTMLElement | null;
  inertTargetWasInert: boolean;
  previousBodyOverflow: string;
  backgroundLocked: boolean;
  shareFeedbackTimer: number | null;
  touchStartX: number;
  touchStartY: number;
}

let activeSession: ZoomSession | null = null;

const SWIPE_THRESHOLD = 50;
const SETTLED_IMAGE_CLASS = 'image-zoom-clone--settled';

function setSessionTimer(session: ZoomSession, callback: () => void, delay: number): number {
  return window.setTimeout(() => {
    if (activeSession === session) callback();
  }, delay);
}

function clearTimer(timer: number | null) {
  if (timer === null) return;
  window.clearTimeout(timer);
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

function finishMotion(session: ZoomSession, phase: 'opening' | 'navigating') {
  if (activeSession !== session || session.phase !== phase) return;
  settleClone(session);
  session.phase = 'open';
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
  const hasIndex = siblings.every((el) => el.dataset.galleryIndex !== undefined);
  if (hasIndex) {
    siblings.sort(
      (a, b) => Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex),
    );
  }
  return siblings;
}

function currentItem(session: ZoomSession): ZoomGalleryItem | null {
  return session.items[session.currentIndex] || null;
}

function settleClone(session: ZoomSession) {
  const clone = session.clonedImage;
  if (!clone) return;
  clone.classList.add(SETTLED_IMAGE_CLASS);
  clone.style.removeProperty('top');
  clone.style.removeProperty('left');
  clone.style.removeProperty('width');
  clone.style.removeProperty('height');
  clone.style.removeProperty('opacity');
  clone.style.removeProperty('transform');
}

function freezeCloneAtPresentation(session: ZoomSession) {
  const clone = session.clonedImage;
  const item = currentItem(session);
  if (!clone || !item) return;
  const rect = clone.classList.contains(SETTLED_IMAGE_CLASS)
    ? getContainedImageRect(item, clone)
    : clone.getBoundingClientRect();
  const opacity = getComputedStyle(clone).opacity;
  clone.style.transition = 'none';
  clone.classList.remove(SETTLED_IMAGE_CLASS);
  clone.style.transform = 'none';
  clone.style.opacity = opacity;
  setZoomRect(clone, rect);
  void clone.offsetHeight;
  clone.style.transition = '';
}

function handleOverlayClick(session: ZoomSession, event: MouseEvent) {
  const clone = session.clonedImage;
  const item = currentItem(session);
  if (!clone || !item || event.target !== clone || !clone.classList.contains(SETTLED_IMAGE_CLASS)) return;
  const rect = getContainedImageRect(item, clone);
  const outsideImage = event.clientX < rect.left || event.clientX > rect.left + rect.width
    || event.clientY < rect.top || event.clientY > rect.top + rect.height;
  if (outsideImage) requestSessionFrame(session, () => closeZoom());
}

function preloadAdjacentImages(session: ZoomSession) {
  [session.items[session.currentIndex - 1], session.items[session.currentIndex + 1]].forEach((item) => {
    if (item?.thumbSrc) void preloadImage(item.thumbSrc);
  });
}

async function createClone(
  session: ZoomSession,
  item: ZoomGalleryItem,
  initialRect?: ZoomRect,
): Promise<HTMLImageElement | null> {
  if (!session.view) return null;
  const clone = createZoomImage(item, initialRect);
  session.view.overlay.appendChild(clone);
  await decodeImage(clone);
  if (activeSession !== session) {
    clone.remove();
    return null;
  }
  return clone;
}

function upgradeCloneToFull(session: ZoomSession, clone: HTMLImageElement, item: ZoomGalleryItem) {
  upgradeImageSource(clone, item, () => activeSession === session);
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

function lockBackground(session: ZoomSession) {
  session.previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  session.inertTarget = document.querySelector<HTMLElement>('.wrapper');
  if (session.inertTarget) {
    session.inertTargetWasInert = session.inertTarget.inert;
    session.inertTarget.inert = true;
  }
  session.backgroundLocked = true;
}

function unlockBackground(session: ZoomSession) {
  if (!session.backgroundLocked) return;
  document.body.style.overflow = session.previousBodyOverflow;
  if (session.inertTarget) session.inertTarget.inert = session.inertTargetWasInert;
  session.backgroundLocked = false;
}


function attachInteractionListeners(session: ZoomSession) {
  const signal = session.controller.signal;
  document.addEventListener('keydown', handleKeyDown, { signal });
  document.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
  document.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
  document.addEventListener('touchmove', preventTouchMove, { passive: false, signal });
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
    inertTarget: null,
    inertTargetWasInert: false,
    previousBodyOverflow: '',
    backgroundLocked: false,
    shareFeedbackTimer: null,
    touchStartX: 0,
    touchStartY: 0,
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
    signal: session.controller.signal,
    onClose: () => closeZoom(),
    onBackdrop: () => requestSessionFrame(session, () => closeZoom()),
    onOverlayClick: (event) => handleOverlayClick(session, event),
    onPrevious: () => void navigate(session, -1),
    onNext: () => void navigate(session, 1),
    onShare: () => void copyCurrentLink(session),
  });
  lockBackground(session);
  attachInteractionListeners(session);

  const clone = await createClone(session, selected, originalRect);
  if (!clone || activeSession !== session) return false;
  session.clonedImage = clone;
  const target = computeZoomTarget(selected, clone, originalRect);
  upgradeCloneToFull(session, clone, selected);

  if (session.directEntrance) {
    setZoomRect(clone, target);
    clone.classList.add('image-zoom-clone--direct');
  }

  void clone.offsetHeight;
  clone.style.transition = '';
  if (!await waitForSessionFrame(session)) return false;
  if (origin) origin.style.visibility = 'hidden';

  requestSessionFrame(session, () => {
    if (session.phase !== 'opening') return;
    const view = session.view;
    const item = currentItem(session);
    if (!view || !item) return;
    view.backdrop.classList.add('active');
    view.controls.classList.add('active');
    updateZoomNavigation(view, session.currentIndex, session.items.length);
    updateZoomMeta(view, item);
    preloadAdjacentImages(session);
    if (session.clonedImage) {
      setZoomRect(session.clonedImage, target);
      session.clonedImage.classList.add('zoomed');
    }
    (options.direct ? view.overlay : view.closeButton).focus({ preventScroll: true });
    setSessionTimer(session, () => finishMotion(session, 'opening'), transitionDuration());
  });

  return true;
}

export function openZoom(img: HTMLImageElement) {
  const galleryItems = findSiblingImages(img).map(itemForImage);
  const index = Math.max(0, galleryItems.findIndex((item) => item.element === img));
  return openZoomGallery(galleryItems, index, { returnFocus: img });
}

async function navigate(session: ZoomSession, direction: number) {
  if (activeSession !== session || session.phase !== 'open' || !session.clonedImage) return;
  const newIndex = session.currentIndex + direction;
  if (newIndex < 0 || newIndex >= session.items.length) return;

  session.phase = 'navigating';
  freezeCloneAtPresentation(session);
  session.view?.metaLine.classList.add('is-fading');
  const oldItem = currentItem(session);
  const newItem = session.items[newIndex];
  if (!newItem) {
    session.phase = 'open';
    return;
  }

  const newClone = await createClone(session, newItem);
  if (!newClone || activeSession !== session) return;
  if (session.phase !== 'navigating') {
    newClone.remove();
    return;
  }
  const target = computeZoomTarget(newItem, newClone);
  upgradeCloneToFull(session, newClone, newItem);
  setZoomRect(newClone, target);
  newClone.classList.add('zoomed');

  const reducedMotion = prefersReducedMotion();
  const slide = window.innerWidth;
  const enterFrom = direction > 0 ? slide : -slide;
  if (reducedMotion) {
    newClone.style.opacity = '0';
  } else {
    newClone.style.transform = `translateX(${enterFrom}px)`;
  }

  void newClone.offsetHeight;
  newClone.style.transition = '';
  if (!await waitForSessionFrame(session)) {
    newClone.remove();
    return;
  }
  if (session.phase !== 'navigating') {
    newClone.remove();
    return;
  }
  if (oldItem?.element?.isConnected) oldItem.element.style.visibility = '';
  if (newItem.element?.isConnected) newItem.element.style.visibility = 'hidden';

  const oldClone = session.clonedImage;
  session.currentIndex = newIndex;
  session.clonedImage = newClone;
  session.options.onChange?.(newItem, session.currentIndex);
  preloadAdjacentImages(session);

  requestSessionFrame(session, () => {
    if (session.phase !== 'navigating') return;
    if (reducedMotion) {
      newClone.style.opacity = '1';
      oldClone.style.opacity = '0';
    } else {
      newClone.style.transform = 'translateX(0)';
      oldClone.style.transform = `translateX(${-enterFrom}px)`;
    }
  });

  setSessionTimer(session, () => {
    if (session.phase !== 'navigating') return;
    if (session.view) {
      updateZoomNavigation(session.view, session.currentIndex, session.items.length);
      updateZoomMeta(session.view, newItem);
      session.view.metaLine.classList.remove('is-fading');
    }
  }, transitionDuration() / 2);

  setSessionTimer(session, () => {
    if (session.phase !== 'navigating') return;
    newClone.style.opacity = '';
    newClone.style.transform = '';
    oldClone.remove();
    finishMotion(session, 'navigating');
  }, transitionDuration());
}

function finishClose(session: ZoomSession) {
  if (activeSession !== session) return;
  activeSession = null;

  session.items.forEach((item) => {
    if (item.element?.isConnected) item.element.style.visibility = '';
  });
  session.controller.abort();
  session.view?.overlay.remove();
  unlockBackground(session);

  const focusTarget = session.options.returnFocus || session.previousFocus;
  const onClosed = session.options.onClosed;
  if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  onClosed?.();
}

export function closeZoom(options: CloseZoomOptions = {}) {
  const session = activeSession;
  if (!session) return;
  if (session.phase === 'closing') {
    if (options.immediate) finishClose(session);
    return;
  }
  if (!options.skipRequest && session.options.onRequestClose?.() === true) return;

  if (options.immediate || !session.view || !session.clonedImage) {
    finishClose(session);
    return;
  }
  session.phase = 'closing';
  freezeCloneAtPresentation(session);

  const clone = session.clonedImage;
  session.view.overlay.querySelectorAll<HTMLImageElement>('.image-zoom-clone').forEach((image) => {
    if (image !== clone) image.style.opacity = '0';
  });
  clone.style.opacity = '';
  const selected = currentItem(session);
  const origin = !session.directEntrance && selected?.element?.isConnected
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

function handleKeyDown(event: KeyboardEvent) {
  const session = activeSession;
  if (!session) return;
  if (event.key === 'Escape') closeZoom();
  else if (event.key === 'ArrowLeft') void navigate(session, -1);
  else if (event.key === 'ArrowRight') void navigate(session, 1);
  else if (event.key === 'Tab' && session.view) {
    const focusable = Array.from(
      session.view.controls.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([hidden])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (document.activeElement === session.view.overlay) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function preventTouchMove(event: TouchEvent) {
  event.preventDefault();
}

function handleTouchStart(event: TouchEvent) {
  const session = activeSession;
  if (!session) return;
  if (event.touches.length !== 1) return;
  session.touchStartX = event.touches[0].clientX;
  session.touchStartY = event.touches[0].clientY;
}

function handleTouchEnd(event: TouchEvent) {
  const session = activeSession;
  if (!session) return;
  if (!event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - session.touchStartX;
  const dy = event.changedTouches[0].clientY - session.touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
  void navigate(session, dx < 0 ? 1 : -1);
}

function handleImageActivation(event: MouseEvent | KeyboardEvent) {
  if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target as HTMLElement | null;
  const img = target?.closest<HTMLImageElement>('[data-zoomable]');
  if (!img || img.tagName !== 'IMG') return;
  event.preventDefault();
  event.stopPropagation();
  void openZoom(img);
}

function decorateZoomableImages(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>('img[data-zoomable]').forEach((image) => {
    if (!image.hasAttribute('tabindex')) image.tabIndex = 0;
    if (!image.hasAttribute('role')) image.setAttribute('role', 'button');
    if (!image.hasAttribute('aria-label')) {
      image.setAttribute('aria-label', `Open ${image.alt || 'image'}`);
    }
  });
}

document.addEventListener('click', handleImageActivation);
document.addEventListener('keydown', handleImageActivation);
document.addEventListener('astro:page-load', () => decorateZoomableImages());
decorateZoomableImages();
