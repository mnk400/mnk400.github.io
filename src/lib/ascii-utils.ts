// Image → ASCII conversion. Used by the live camera tool and the photo
// converter. Pure functions; the only DOM touch is the offscreen probe
// in calculateOptimalFontSize for measuring real mono char width.

export const ASCII_PALETTES = {
  classic: '@%#*+=-:.',
  blocks: '█▓▒░',
  minimal: '#-.',
} as const;

export type AsciiPalette = keyof typeof ASCII_PALETTES;
export type DitherMode = 'none' | 'ordered' | 'floyd';

const ASCII_DITHER_MODES: DitherMode[] = ['none', 'ordered', 'floyd'];
const DEFAULT_CHARS = '@%#*+=-:. ';

export interface AsciiOptions {
  characters?: string;
  dither?: DitherMode;
}

interface NormalizedOptions {
  characters: string;
  dither: DitherMode;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(options?: AsciiOptions | string): NormalizedOptions {
  if (typeof options === 'string') return { characters: options, dither: 'none' };
  const o = options ?? {};
  const dither = o.dither && ASCII_DITHER_MODES.includes(o.dither) ? o.dither : 'none';
  return { characters: o.characters || DEFAULT_CHARS, dither };
}

// Alpha-blend onto white so transparent pixels read as background, not black.
function pixelBrightness(pixels: Uint8ClampedArray, idx: number) {
  const alpha = pixels[idx + 3] / 255;
  const r = pixels[idx] * alpha + 255 * (1 - alpha);
  const g = pixels[idx + 1] * alpha + 255 * (1 - alpha);
  const b = pixels[idx + 2] * alpha + 255 * (1 - alpha);
  return (r + g + b) / 3;
}

function brightnessToChar(value: number, chars: string[]) {
  return chars[Math.floor(clamp(value, 0, 255) / 255 * (chars.length - 1))];
}

function quantize(value: number, levels: number) {
  if (levels <= 1) return { index: 0, value: 0 };
  const index = Math.round(clamp(value, 0, 255) / 255 * (levels - 1));
  return { index, value: index / (levels - 1) * 255 };
}

function convertOrdered(pixels: Uint8ClampedArray, width: number, height: number, chars: string[]) {
  const bayer = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ];
  const step = chars.length > 1 ? 255 / (chars.length - 1) : 255;
  let ascii = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const threshold = (bayer[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * step;
      ascii += brightnessToChar(pixelBrightness(pixels, idx) + threshold, chars);
    }
    ascii += '\n';
  }
  return ascii;
}

function convertFloyd(pixels: Uint8ClampedArray, width: number, height: number, chars: string[]) {
  const values = new Array<number>(width * height);
  for (let i = 0; i < values.length; i++) values[i] = pixelBrightness(pixels, i * 4);

  const addError = (x: number, y: number, amount: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    values[y * width + x] += amount;
  };

  let ascii = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const q = quantize(values[idx], chars.length);
      const error = values[idx] - q.value;
      ascii += chars[q.index];
      addError(x + 1, y, error * 7 / 16);
      addError(x - 1, y + 1, error * 3 / 16);
      addError(x, y + 1, error * 5 / 16);
      addError(x + 1, y + 1, error * 1 / 16);
    }
    ascii += '\n';
  }
  return ascii;
}

export function convertToAscii(
  imageData: ImageData,
  width: number,
  height: number,
  options?: AsciiOptions | string,
): string {
  const pixels = imageData.data;
  const settings = normalize(options);
  const chars = Array.from(settings.characters);
  if (!chars.length) return '';

  if (settings.dither === 'ordered') return convertOrdered(pixels, width, height, chars);
  if (settings.dither === 'floyd') return convertFloyd(pixels, width, height, chars);

  let ascii = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ascii += brightnessToChar(pixelBrightness(pixels, (y * width + x) * 4), chars);
    }
    ascii += '\n';
  }
  return ascii;
}

// Characters are taller than wide, so vertical resolution is halved.
export function calculateHeight(width: number, sourceWidth: number, sourceHeight: number) {
  return Math.floor(width / (sourceWidth / sourceHeight) / 2);
}

const monoRatioCache = new Map<string, number>();

function measureMonoCharRatio(fontFamily: string) {
  const cached = monoRatioCache.get(fontFamily);
  if (cached !== undefined) return cached;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:200px';
  probe.style.fontFamily = fontFamily;
  probe.textContent = 'M'.repeat(100);
  document.body.appendChild(probe);
  const charWidth = probe.getBoundingClientRect().width / 100;
  document.body.removeChild(probe);
  const ratio = 200 / charWidth;
  monoRatioCache.set(fontFamily, ratio);
  return ratio;
}

// Picks a font-size such that charCount monospace glyphs span exactly
// containerWidth in target's real font stack — beats fixed 0.6-em heuristics.
export function calculateOptimalFontSize(containerWidth: number, charCount: number, target?: Element) {
  const fontFamily = target ? getComputedStyle(target).fontFamily : 'monospace';
  return containerWidth / charCount * measureMonoCharRatio(fontFamily);
}
