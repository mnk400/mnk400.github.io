// Image Zoom — singleton lightbox controller. Decorates any
// `<img data-zoomable>` on the page with click-to-zoom, keyboard/touch
// dismiss, and (inside a `[data-gallery]` ancestor) prev/next nav across
// siblings + optional caption from data-title / data-meta.
//
// Ported from assets/js/components/image-zoom.js. The legacy file stays on
// disk for the design-system export per AGENTS.md.
//
// This module exports the public openZoom/closeZoom API and — as a side
// effect on first import — registers the document-level click handler.
// Vite/Astro dedupes the module across imports, so the handler registers
// exactly once per page even if multiple .astro components import it.

const ICON_SVGS: Record<string, string> = {
  'caret-left': '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/></svg>',
  'caret-right': '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/></svg>',
  x: '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/></svg>',
};

let backdrop: HTMLElement | null = null;
let clonedImage: HTMLImageElement | null = null;
let controlsEl: HTMLElement | null = null;
let metaLineEl: HTMLElement | null = null;
let navLineEl: HTMLElement | null = null;
let closeButton: HTMLElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;
let counterEl: HTMLElement | null = null;
let captionEl: HTMLElement | null = null;
let detailEl: HTMLElement | null = null;
let metaSepEl: HTMLElement | null = null;

let originalImage: HTMLImageElement | null = null;
let siblings: HTMLImageElement[] = [];
let currentIndex = 0;
let isAnimating = false;

type Rect = { top: number; left: number; width: number; height: number };

function isTouchDevice(): boolean {
  return window.matchMedia('(hover: none)').matches;
}

function setRect(el: HTMLElement, rect: Rect) {
  el.style.top = rect.top + 'px';
  el.style.left = rect.left + 'px';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
}

function metaFor(img: HTMLImageElement) {
  return {
    title: img.dataset.title || '',
    detail: img.dataset.meta || '',
  };
}

function findSiblings(img: HTMLImageElement): HTMLImageElement[] {
  const container = img.closest('[data-gallery]');
  if (!container) return [img];
  const items = Array.from(container.querySelectorAll<HTMLImageElement>('[data-zoomable]'));
  // If the gallery tagged items with data-gallery-index, honor that ordering —
  // masonry renders column-by-column in DOM, but we want prev/next to follow
  // the authored (manifest) order.
  const hasIndex = items.every((el) => el.dataset.galleryIndex !== undefined);
  if (hasIndex) {
    items.sort(
      (a, b) => Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex),
    );
  }
  return items;
}

function calculateZoomedDimensions(naturalWidth: number, naturalHeight: number, hasMeta: boolean) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalPadding = isTouchDevice() ? 20 : 60;
  const minVerticalPadding = 30;

  const stripBottomMargin = 20;
  const navHeight = 24;
  const metaHeight = hasMeta ? 20 : 0;
  const stripGap = hasMeta ? 5 : 0;
  const stripHeight = navHeight + stripGap + metaHeight;
  const stripTop = viewportHeight - stripBottomMargin - stripHeight;

  const maxWidth = viewportWidth - horizontalPadding * 2;
  const maxHeight = stripTop - minVerticalPadding * 2;

  const imageAspect = naturalWidth / naturalHeight;
  const viewportAspect = maxWidth / maxHeight;

  let finalWidth: number;
  let finalHeight: number;
  if (imageAspect > viewportAspect) {
    finalWidth = maxWidth;
    finalHeight = finalWidth / imageAspect;
  } else {
    finalHeight = maxHeight;
    finalWidth = finalHeight * imageAspect;
  }

  return {
    width: finalWidth,
    height: finalHeight,
    left: (viewportWidth - finalWidth) / 2,
    top: (stripTop - finalHeight) / 2,
  };
}

async function createClone(img: HTMLImageElement, initialRect?: DOMRect | Rect): Promise<HTMLImageElement> {
  const clone = document.createElement('img');
  clone.src = img.src;
  clone.alt = img.alt;
  clone.className = 'image-zoom-clone';
  clone.style.position = 'fixed';
  clone.style.transition = 'none';
  if (initialRect) setRect(clone, initialRect as Rect);
  document.body.appendChild(clone);
  try {
    await clone.decode();
  } catch {}
  return clone;
}

function upgradeCloneToFull(clone: HTMLImageElement, img: HTMLImageElement) {
  const fullSrc = img.dataset.fullSrc;
  if (!fullSrc || fullSrc === clone.src) return;
  const loader = new Image();
  loader.src = fullSrc;
  loader.decode().then(() => {
    if (clone.isConnected) clone.src = fullSrc;
  }).catch(() => {});
}

function computeTargetForImg(img: HTMLImageElement, clone: HTMLImageElement, fallbackRect: DOMRect | Rect) {
  const aspectW = clone.naturalWidth || img.naturalWidth || fallbackRect.width;
  const aspectH = clone.naturalHeight || img.naturalHeight || fallbackRect.height;
  const { title, detail } = metaFor(img);
  return calculateZoomedDimensions(aspectW, aspectH, !!(title || detail));
}

function makeButton(
  className: string,
  icon: keyof typeof ICON_SVGS,
  ariaLabel: string,
  onClick: () => void,
  parent: HTMLElement = document.body,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = className;
  btn.innerHTML = ICON_SVGS[icon];
  btn.setAttribute('aria-label', ariaLabel);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  parent.appendChild(btn);
  return btn;
}

function makeSeparator(extraClass?: string): HTMLElement {
  const sep = document.createElement('span');
  sep.className = 'image-zoom-sep' + (extraClass ? ' ' + extraClass : '');
  sep.textContent = '·';
  sep.setAttribute('aria-hidden', 'true');
  return sep;
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target !== backdrop) return;
  e.preventDefault();
  e.stopPropagation();
  requestAnimationFrame(closeZoom);
}

function createOverlay(multi: boolean) {
  backdrop = document.createElement('button');
  (backdrop as HTMLButtonElement).type = 'button';
  backdrop.className = 'image-zoom-backdrop';
  backdrop.setAttribute('aria-label', 'Close zoomed image');
  backdrop.addEventListener('click', handleBackdropClick);
  document.body.appendChild(backdrop);

  controlsEl = document.createElement('div');
  controlsEl.className = 'image-zoom-controls';
  document.body.appendChild(controlsEl);

  metaLineEl = document.createElement('div');
  metaLineEl.className = 'image-zoom-meta';
  controlsEl.appendChild(metaLineEl);

  captionEl = document.createElement('span');
  captionEl.className = 'image-zoom-caption';
  metaLineEl.appendChild(captionEl);

  metaSepEl = makeSeparator('image-zoom-sep--meta');
  metaLineEl.appendChild(metaSepEl);

  detailEl = document.createElement('span');
  detailEl.className = 'image-zoom-detail';
  metaLineEl.appendChild(detailEl);

  navLineEl = document.createElement('div');
  navLineEl.className = 'image-zoom-nav';
  controlsEl.appendChild(navLineEl);

  if (multi) {
    prevButton = makeButton(
      'image-zoom-control-button image-zoom-nav-button image-zoom-nav-button--prev',
      'caret-left',
      'Previous image',
      () => navigate(-1),
      navLineEl,
    );
    nextButton = makeButton(
      'image-zoom-control-button image-zoom-nav-button image-zoom-nav-button--next',
      'caret-right',
      'Next image',
      () => navigate(1),
      navLineEl,
    );

    navLineEl.appendChild(makeSeparator('image-zoom-sep--counter'));

    counterEl = document.createElement('span');
    counterEl.className = 'image-zoom-counter';
    navLineEl.appendChild(counterEl);

    navLineEl.appendChild(makeSeparator('image-zoom-sep--close'));
  }

  closeButton = makeButton(
    'image-zoom-control-button image-zoom-close',
    'x',
    'Close zoomed image',
    closeZoom,
    navLineEl,
  );
}

function updateMeta() {
  if (!originalImage) return;
  const { title, detail } = metaFor(originalImage);

  if (captionEl) {
    captionEl.textContent = title || '';
    captionEl.style.display = title ? '' : 'none';
  }
  if (detailEl) {
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? '' : 'none';
  }
  if (metaSepEl) {
    metaSepEl.style.display = title && detail ? '' : 'none';
  }
  if (metaLineEl) {
    metaLineEl.classList.toggle('is-empty', !title && !detail);
  }
}

function updateNavState() {
  if (counterEl) {
    counterEl.textContent = `${currentIndex + 1} / ${siblings.length}`;
    const digits = String(siblings.length).length;
    counterEl.style.minWidth = `${digits * 2 + 3}ch`;
  }
  if (prevButton) prevButton.disabled = currentIndex <= 0;
  if (nextButton) nextButton.disabled = currentIndex >= siblings.length - 1;
}

async function openZoom(img: HTMLImageElement) {
  if (isAnimating) return;
  isAnimating = true;
  originalImage = img;

  siblings = findSiblings(img);
  currentIndex = Math.max(0, siblings.indexOf(img));

  const originalRect = img.getBoundingClientRect();

  createOverlay(siblings.length > 1);

  clonedImage = await createClone(img, originalRect);
  const target = computeTargetForImg(img, clonedImage, originalRect);
  upgradeCloneToFull(clonedImage, img);

  // Force reflow before transitioning
  void clonedImage.offsetHeight;
  clonedImage.style.transition = '';

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  originalImage.style.visibility = 'hidden';

  requestAnimationFrame(() => {
    backdrop?.classList.add('active');
    controlsEl?.classList.add('active');
    closeButton?.classList.add('active');
    prevButton?.classList.add('active');
    nextButton?.classList.add('active');
    updateNavState();
    updateMeta();

    if (clonedImage) {
      setRect(clonedImage, target);
      clonedImage.classList.add('zoomed');
    }

    setTimeout(() => {
      isAnimating = false;
    }, 300);
  });

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchmove', preventTouchMove, { passive: false });
}

async function navigate(direction: number) {
  if (isAnimating || !clonedImage) return;
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= siblings.length) return;

  isAnimating = true;

  if (metaLineEl) metaLineEl.classList.add('is-fading');

  if (originalImage) originalImage.style.visibility = '';
  const newImg = siblings[newIndex];
  currentIndex = newIndex;
  originalImage = newImg;

  const originalRect = newImg.getBoundingClientRect();
  const newClone = await createClone(newImg);
  const target = computeTargetForImg(newImg, newClone, originalRect);
  upgradeCloneToFull(newClone, newImg);

  const slide = window.innerWidth;
  const enterFrom = direction > 0 ? slide : -slide;

  setRect(newClone, target);
  newClone.style.transform = `translateX(${enterFrom}px)`;
  newClone.classList.add('zoomed');

  void newClone.offsetHeight;
  newClone.style.transition = '';
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  newImg.style.visibility = 'hidden';

  const oldClone = clonedImage;
  clonedImage = newClone;

  requestAnimationFrame(() => {
    newClone.style.transform = 'translateX(0)';
    oldClone.style.transform = `translateX(${-enterFrom}px)`;
  });

  setTimeout(() => {
    updateNavState();
    updateMeta();
    if (metaLineEl) metaLineEl.classList.remove('is-fading');
  }, 150);

  setTimeout(() => {
    oldClone.remove();
    isAnimating = false;
  }, 300);
}

function closeZoom() {
  if (isAnimating || !clonedImage || !originalImage) return;
  isAnimating = true;

  originalImage.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });

  const currentRect = originalImage.getBoundingClientRect();
  setRect(clonedImage, currentRect);
  clonedImage.classList.remove('zoomed');
  backdrop?.classList.remove('active');
  controlsEl?.classList.remove('active');
  closeButton?.classList.remove('active');
  prevButton?.classList.remove('active');
  nextButton?.classList.remove('active');

  setTimeout(() => {
    if (originalImage) originalImage.style.visibility = '';

    [clonedImage, backdrop, controlsEl].filter(Boolean).forEach((el) => el!.remove());
    clonedImage = backdrop = controlsEl = closeButton = null;
    metaLineEl = navLineEl = null;
    prevButton = nextButton = counterEl = null;
    captionEl = detailEl = metaSepEl = null;

    originalImage = null;
    siblings = [];
    currentIndex = 0;
    isAnimating = false;

    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchmove', preventTouchMove);
  }, 300);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeZoom();
  else if (e.key === 'ArrowLeft') navigate(-1);
  else if (e.key === 'ArrowRight') navigate(1);
}

let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

function preventTouchMove(e: TouchEvent) {
  e.preventDefault();
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e: TouchEvent) {
  if (!e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD) return;
  if (Math.abs(dx) < Math.abs(dy)) return;
  navigate(dx < 0 ? 1 : -1);
}

function handleImageClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const img = target.closest<HTMLElement>('[data-zoomable]');
  if (img && img.tagName === 'IMG') {
    e.preventDefault();
    e.stopPropagation();
    openZoom(img as HTMLImageElement);
  }
}

// Public API for callers that want to open the zoom programmatically.
export { openZoom, closeZoom };

// Module-level side effect: registers the singleton click handler. Runs once
// per page because Vite/Astro dedupes the module across all importers.
document.addEventListener('click', handleImageClick);
