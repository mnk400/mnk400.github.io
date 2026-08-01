import { site } from '../data/site.ts';

/**
 * Opt an image into CORS so a canvas can read its pixels back.
 *
 * Must be called before assigning `src`. Browsers cache CORS and non-CORS
 * responses separately, so every path that loads a given image has to call
 * this or the downloads double.
 */
export function allowPixelReads(image: HTMLImageElement, src: string): void {
  try {
    const { origin } = new URL(src, window.location.href);
    if (site.pixelReadableOrigins.some((allowed) => allowed === origin)) {
      image.crossOrigin = 'anonymous';
    }
  } catch {
    // Unparseable src; let it load normally.
  }
}
