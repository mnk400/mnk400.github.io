import type { PaletteColor } from '../color-palette.ts';
import { waitForAnimationFrame } from './motion.ts';
import type { ZoomGalleryItem } from './index.ts';

export interface ZoomView {
  overlay: HTMLDialogElement;
  backdrop: HTMLButtonElement;
  viewport: HTMLElement;
  items: ZoomGalleryItem[];
  slides: Map<number, HTMLImageElement>;
  controls: HTMLElement;
  metaLine: HTMLElement;
  closeButton: HTMLButtonElement;
  prevButton: HTMLButtonElement | null;
  nextButton: HTMLButtonElement | null;
  shareButton: HTMLButtonElement | null;
  shareLinkIcon: HTMLElement | null;
  shareCheckIcon: HTMLElement | null;
  counter: HTMLElement | null;
  palette: HTMLElement;
  caption: HTMLElement;
  detail: HTMLElement;
  metaSeparator: HTMLElement;
  scrollX: number;
  scrollY: number;
}

interface ZoomViewOptions {
  direct: boolean;
  multi: boolean;
  share: boolean;
  items: ZoomGalleryItem[];
  signal: AbortSignal;
  onClose: () => void;
  onBackdrop: () => void;
  onOverlayClick: (event: MouseEvent) => void;
  onPrevious: () => void;
  onNext: () => void;
  onShare: () => void;
}

function bindClick(button: HTMLButtonElement, callback: () => void, signal: AbortSignal) {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    callback();
  }, { signal });
}

function bindPalettePulse(palette: HTMLElement, signal: AbortSignal) {
  palette.addEventListener('click', (event) => {
    const swatch = (event.target as HTMLElement).closest<HTMLElement>('.image-zoom-palette__swatch');
    if (!swatch) return;
    swatch.classList.remove('is-pulsing');
    void swatch.offsetWidth; // reflow, so rapid clicks retrigger
    swatch.classList.add('is-pulsing');
  }, { signal });

  palette.addEventListener('animationend', (event) => {
    if (event.animationName === 'charm-pulse') {
      (event.target as HTMLElement).classList.remove('is-pulsing');
    }
  }, { signal });
}

export function createZoomView(options: ZoomViewOptions): ZoomView {
  const overlay = document.querySelector<HTMLDialogElement>('[data-image-zoom]');
  if (!overlay) throw new Error('Image zoom dialog is missing');
  const backdrop = overlay.querySelector<HTMLButtonElement>('[data-zoom-backdrop]')!;
  const viewport = overlay.querySelector<HTMLElement>('[data-zoom-viewport]')!;
  const controls = overlay.querySelector<HTMLElement>('[data-zoom-controls]')!;
  const metaLine = overlay.querySelector<HTMLElement>('[data-zoom-meta]')!;
  const caption = overlay.querySelector<HTMLElement>('[data-zoom-caption]')!;
  const detail = overlay.querySelector<HTMLElement>('[data-zoom-detail]')!;
  const metaSeparator = overlay.querySelector<HTMLElement>('[data-zoom-meta-separator]')!;
  const closeButton = overlay.querySelector<HTMLButtonElement>('[data-zoom-close]')!;
  const previous = overlay.querySelector<HTMLButtonElement>('[data-zoom-previous]')!;
  const next = overlay.querySelector<HTMLButtonElement>('[data-zoom-next]')!;
  const counter = overlay.querySelector<HTMLElement>('[data-zoom-counter]')!;
  const palette = overlay.querySelector<HTMLElement>('[data-zoom-palette]')!;
  const shareButton = overlay.querySelector<HTMLButtonElement>('[data-zoom-share]')!;
  const shareLinkIcon = overlay.querySelector<HTMLElement>('[data-zoom-share-link]')!;
  const shareCheckIcon = overlay.querySelector<HTMLElement>('[data-zoom-share-check]')!;

  // Slides are mounted on demand by renderZoomSlides; the spacer alone
  // gives the strip its full scroll width.
  const spacer = document.createElement('div');
  spacer.className = 'image-zoom-spacer';
  spacer.style.setProperty('--zoom-count', String(options.items.length));
  viewport.replaceChildren(spacer);

  [previous, next, counter].forEach((element) => { element.hidden = !options.multi; });
  shareButton.hidden = !options.share;

  overlay.classList.remove('image-zoom-overlay--closing-direct');
  overlay.classList.toggle(
    'image-zoom-overlay--has-meta',
    options.items.some((item) => !!(item.title || item.meta)),
  );
  viewport.classList.remove('active');
  controls.classList.remove('active');
  backdrop.classList.toggle('active', options.direct);
  overlay.addEventListener('cancel', (event) => {
    event.preventDefault();
    options.onClose();
  }, { signal: options.signal });
  overlay.addEventListener('click', options.onOverlayClick, { signal: options.signal });
  backdrop.addEventListener('click', (event) => {
    if (event.target !== backdrop) return;
    event.preventDefault();
    event.stopPropagation();
    options.onBackdrop();
  }, { signal: options.signal });
  bindClick(closeButton, options.onClose, options.signal);
  if (options.multi) {
    bindClick(previous, options.onPrevious, options.signal);
    bindClick(next, options.onNext, options.signal);
  }
  if (options.share) bindClick(shareButton, options.onShare, options.signal);
  bindPalettePulse(palette, options.signal);

  const { scrollX, scrollY } = window;
  document.body.style.setProperty('--image-zoom-scroll-left', `${-scrollX}px`);
  document.body.style.setProperty('--image-zoom-scroll-top', `${-scrollY}px`);
  overlay.showModal();
  return {
    overlay,
    backdrop,
    viewport,
    items: options.items,
    slides: new Map(),
    controls,
    metaLine,
    closeButton,
    prevButton: options.multi ? previous : null,
    nextButton: options.multi ? next : null,
    shareButton: options.share ? shareButton : null,
    shareLinkIcon: options.share ? shareLinkIcon : null,
    shareCheckIcon: options.share ? shareCheckIcon : null,
    counter: options.multi ? counter : null,
    palette,
    caption,
    detail,
    metaSeparator,
    scrollX,
    scrollY,
  };
}

function createSlide(view: ZoomView, index: number): HTMLImageElement {
  const item = view.items[index];
  const slide = document.createElement('div');
  slide.className = 'image-zoom-slide';
  slide.dataset.zoomIndex = String(index);
  slide.style.setProperty('--zoom-index', String(index));
  const image = document.createElement('img');
  image.className = 'image-zoom-image';
  image.alt = item.alt || '';
  image.draggable = false;
  if (item.width && item.height) {
    image.width = item.width;
    image.height = item.height;
  }
  slide.appendChild(image);
  // Insert in index order so DOM (and reading) order matches the visual order.
  const next = [...view.slides.keys()].filter((key) => key > index).sort((a, b) => a - b)[0];
  view.viewport.insertBefore(slide, next === undefined ? null : view.slides.get(next)!.parentElement);
  return image;
}

// Mounts exactly the slides in `indices` and unmounts every other slide.
export function renderZoomSlides(view: ZoomView, indices: Set<number>) {
  view.slides.forEach((image, index) => {
    if (indices.has(index)) return;
    image.removeAttribute('src');
    image.parentElement?.remove();
    view.slides.delete(index);
  });
  indices.forEach((index) => {
    if (index < 0 || index >= view.items.length || view.slides.has(index)) return;
    view.slides.set(index, createSlide(view, index));
  });
}

// Slide pitch in fractional px. clientWidth rounds, and the error would grow
// with the index until deep slides miss their snap points.
export function zoomSlideWidth(view: ZoomView): number {
  return view.viewport.getBoundingClientRect().width;
}

const REVEAL_PASSES = 4;

// The page is pinned under the dialog, so scrolling it means moving the pin;
// destroyZoomView restores the window to the adjusted offset. Cards entering
// the viewport trade content-visibility placeholders for real heights a frame
// later, so re-center until the element stops moving.
export async function revealInPinnedPage(view: ZoomView, element: HTMLElement) {
  for (let pass = 0; pass < REVEAL_PASSES; pass += 1) {
    const rect = element.getBoundingClientRect();
    if (pass === 0 && rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    const centered = view.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
    // body.scrollHeight still measures the content while pinned (the root's
    // collapses) and counts any gallery pages rendered for this close.
    const limit = document.body.scrollHeight - window.innerHeight;
    const next = Math.round(Math.max(0, Math.min(centered, limit)));
    if (Math.abs(next - view.scrollY) <= 1) return;
    view.scrollY = next;
    document.body.style.setProperty('--image-zoom-scroll-top', `${-next}px`);
    // A rAF callback runs before that frame's layout; the next runs after it.
    await waitForAnimationFrame();
    await waitForAnimationFrame();
  }
}

export function destroyZoomView(view: ZoomView) {
  resetZoomShareFeedback(view);
  view.viewport.classList.remove('active');
  view.backdrop.classList.remove('active');
  view.controls.classList.remove('active');
  view.overlay.classList.remove(
    'image-zoom-overlay--closing-direct',
    'image-zoom-overlay--has-meta',
  );
  view.viewport.replaceChildren();
  if (view.overlay.open) view.overlay.close();
  document.body.style.removeProperty('--image-zoom-scroll-left');
  document.body.style.removeProperty('--image-zoom-scroll-top');
  window.scrollTo(view.scrollX, view.scrollY);
}

export function updateZoomMeta(view: ZoomView, item: ZoomGalleryItem) {
  const title = item.title || '';
  const detail = item.meta || '';
  view.caption.textContent = title;
  view.caption.style.display = title ? '' : 'none';
  view.detail.textContent = detail;
  view.detail.style.display = detail ? '' : 'none';
  view.metaSeparator.style.display = title && detail ? '' : 'none';
  view.metaLine.classList.toggle('is-empty', !title && !detail);
}

export function updateZoomPalette(view: ZoomView, colors: PaletteColor[]) {
  view.palette.hidden = colors.length === 0;
  if (colors.length === 0) {
    view.palette.replaceChildren();
    return;
  }

  const dots = Array.from(view.palette.querySelectorAll<HTMLElement>(':scope > .image-zoom-palette__dot'));
  colors.forEach((color, index) => {
    let dot = dots[index];
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'image-zoom-palette__dot';
      const swatch = document.createElement('span');
      swatch.className = 'image-zoom-palette__swatch';
      dot.appendChild(swatch);
      view.palette.appendChild(dot);
    }
    const swatch = dot.querySelector<HTMLElement>('.image-zoom-palette__swatch');
    if (swatch) swatch.style.backgroundColor = color.hex;
  });
  dots.slice(colors.length).forEach((dot) => dot.remove());
}

export function updateZoomNavigation(view: ZoomView, index: number, total: number) {
  if (view.counter) {
    view.counter.textContent = `${index + 1} / ${total}`;
    view.counter.style.minWidth = `${String(total).length * 2 + 3}ch`;
  }
  if (view.prevButton) view.prevButton.disabled = index <= 0;
  if (view.nextButton) view.nextButton.disabled = index >= total - 1;
}

export function setZoomShareFeedback(view: ZoomView, copied: boolean) {
  if (!view.shareButton) return;
  view.shareButton.setAttribute('aria-label', copied ? 'Link copied' : 'Could not copy link');
  view.shareButton.classList.toggle('is-confirmed', copied);
  if (view.shareLinkIcon) view.shareLinkIcon.hidden = copied;
  if (view.shareCheckIcon) view.shareCheckIcon.hidden = !copied;
}

export function resetZoomShareFeedback(view: ZoomView) {
  if (!view.shareButton) return;
  view.shareButton.setAttribute('aria-label', 'Copy link to image');
  view.shareButton.classList.remove('is-confirmed');
  if (view.shareLinkIcon) view.shareLinkIcon.hidden = false;
  if (view.shareCheckIcon) view.shareCheckIcon.hidden = true;
}
