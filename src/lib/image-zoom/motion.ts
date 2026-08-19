import { allowPixelReads } from '../images.ts';
import type { ZoomGalleryItem } from './index.ts';

export type ZoomRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const DIRECT_CLOSE_DURATION = 220;
const REDUCED_MOTION_CLOSE_DURATION = 120;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function transitionDuration(): number {
  return prefersReducedMotion() ? 160 : 300;
}

export function directCloseDuration(): number {
  return prefersReducedMotion() ? REDUCED_MOTION_CLOSE_DURATION : DIRECT_CLOSE_DURATION;
}

export function setZoomRect(element: HTMLElement, rect: ZoomRect) {
  element.style.top = `${rect.top}px`;
  element.style.left = `${rect.left}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

export async function preloadImage(src: string): Promise<void> {
  if (!src) return;
  const loader = new Image();
  allowPixelReads(loader, src);
  loader.src = src;
  try {
    await loader.decode();
  } catch {}
}

export function createZoomImage(item: ZoomGalleryItem, initialRect?: ZoomRect): HTMLImageElement {
  const image = document.createElement('img');
  allowPixelReads(image, item.thumbSrc);
  image.src = item.thumbSrc;
  image.alt = item.alt || '';
  image.className = 'image-zoom-clone';
  image.style.position = 'fixed';
  image.style.transition = 'none';
  if (initialRect) setZoomRect(image, initialRect);
  return image;
}

export async function decodeImage(image: HTMLImageElement): Promise<void> {
  try {
    await image.decode();
  } catch {}
}

export function upgradeImageSource(
  image: HTMLImageElement,
  item: ZoomGalleryItem,
  shouldApply: () => boolean,
) {
  const fullSrc = item.fullSrc;
  if (!fullSrc || fullSrc === image.src) return;
  const loader = new Image();
  allowPixelReads(loader, fullSrc);
  loader.src = fullSrc;
  loader.decode().then(() => {
    if (shouldApply() && image.isConnected) image.src = fullSrc;
  }).catch(() => {});
}

function fitRect(imageAspect: number, box: ZoomRect): ZoomRect {
  if (imageAspect > box.width / box.height) {
    const height = box.width / imageAspect;
    return { top: box.top + (box.height - height) / 2, left: box.left, width: box.width, height };
  }
  const width = box.height * imageAspect;
  return { top: box.top, left: box.left + (box.width - width) / 2, width, height: box.height };
}

export function getContainedImageRect(
  item: ZoomGalleryItem,
  image: HTMLImageElement,
): ZoomRect {
  const box = image.getBoundingClientRect();
  const width = image.naturalWidth || item.width || box.width || 1;
  const height = image.naturalHeight || item.height || box.height || 1;
  return fitRect(width / height, box);
}

export function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}
