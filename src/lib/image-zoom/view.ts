import type { ZoomGalleryItem } from './index.ts';

export interface ZoomView {
  overlay: HTMLElement;
  backdrop: HTMLButtonElement;
  controls: HTMLElement;
  metaLine: HTMLElement;
  closeButton: HTMLButtonElement;
  prevButton: HTMLButtonElement | null;
  nextButton: HTMLButtonElement | null;
  shareButton: HTMLButtonElement | null;
  shareLinkIcon: HTMLElement | null;
  shareCheckIcon: HTMLElement | null;
  counter: HTMLElement | null;
  caption: HTMLElement;
  detail: HTMLElement;
  metaSeparator: HTMLElement;
}

interface ZoomViewOptions {
  direct: boolean;
  multi: boolean;
  share: boolean;
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

export function createZoomView(options: ZoomViewOptions): ZoomView {
  const template = document.querySelector<HTMLTemplateElement>('#image-zoom-template');
  if (!template) throw new Error('Image zoom template is missing');
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const overlay = fragment.querySelector<HTMLElement>('.image-zoom-overlay')!;
  const backdrop = fragment.querySelector<HTMLButtonElement>('[data-zoom-backdrop]')!;
  const controls = fragment.querySelector<HTMLElement>('[data-zoom-controls]')!;
  const metaLine = fragment.querySelector<HTMLElement>('[data-zoom-meta]')!;
  const caption = fragment.querySelector<HTMLElement>('[data-zoom-caption]')!;
  const detail = fragment.querySelector<HTMLElement>('[data-zoom-detail]')!;
  const metaSeparator = fragment.querySelector<HTMLElement>('[data-zoom-meta-separator]')!;
  const closeButton = fragment.querySelector<HTMLButtonElement>('[data-zoom-close]')!;
  const previous = fragment.querySelector<HTMLButtonElement>('[data-zoom-previous]')!;
  const next = fragment.querySelector<HTMLButtonElement>('[data-zoom-next]')!;
  const counter = fragment.querySelector<HTMLElement>('[data-zoom-counter]')!;
  const shareButton = fragment.querySelector<HTMLButtonElement>('[data-zoom-share]')!;
  const shareLinkIcon = fragment.querySelector<HTMLElement>('[data-zoom-share-link]')!;
  const shareCheckIcon = fragment.querySelector<HTMLElement>('[data-zoom-share-check]')!;

  [previous, next, counter, fragment.querySelector('[data-zoom-counter-separator]')]
    .forEach((element) => { if (element) (element as HTMLElement).hidden = !options.multi; });
  [shareButton, fragment.querySelector('[data-zoom-share-separator]')]
    .forEach((element) => { if (element) (element as HTMLElement).hidden = !options.share; });
  fragment.querySelector<HTMLElement>('[data-zoom-close-separator]')!.hidden = !(options.multi || options.share);

  backdrop.classList.toggle('active', options.direct);
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

  document.body.appendChild(fragment);
  return {
    overlay,
    backdrop,
    controls,
    metaLine,
    closeButton,
    prevButton: options.multi ? previous : null,
    nextButton: options.multi ? next : null,
    shareButton: options.share ? shareButton : null,
    shareLinkIcon: options.share ? shareLinkIcon : null,
    shareCheckIcon: options.share ? shareCheckIcon : null,
    counter: options.multi ? counter : null,
    caption,
    detail,
    metaSeparator,
  };
}

export function updateZoomMeta(view: ZoomView, item: ZoomGalleryItem) {
  const title = item.title || '';
  const detail = item.meta || '';
  view.overlay.classList.toggle('image-zoom-overlay--has-meta', !!(title || detail));
  view.caption.textContent = title;
  view.caption.style.display = title ? '' : 'none';
  view.detail.textContent = detail;
  view.detail.style.display = detail ? '' : 'none';
  view.metaSeparator.style.display = title && detail ? '' : 'none';
  view.metaLine.classList.toggle('is-empty', !title && !detail);
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
