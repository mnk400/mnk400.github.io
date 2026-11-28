// Image → ASCII conversion and drawing, shared by the live camera tool and
// the photo converter. Conversion is pure; the DOM touches are the probes that
// measure glyphs and read colors.

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
  invert?: boolean;
}

interface NormalizedOptions {
  characters: string;
  dither: DitherMode;
  invert: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(options?: AsciiOptions | string): NormalizedOptions {
  if (typeof options === 'string') return { characters: options, dither: 'none', invert: false };
  const o = options ?? {};
  const dither = o.dither && ASCII_DITHER_MODES.includes(o.dither) ? o.dither : 'none';
  return { characters: o.characters || DEFAULT_CHARS, dither, invert: o.invert ?? false };
}

// Darkness as the glyph ramp reads it: 0 takes the densest glyph. Transparent
// pixels blend onto the ground, so they come out as empty space either way.
function pixelBrightness(pixels: Uint8ClampedArray, idx: number, invert: boolean) {
  const alpha = pixels[idx + 3] / 255;
  const ground = invert ? 0 : 255;
  const r = pixels[idx] * alpha + ground * (1 - alpha);
  const g = pixels[idx + 1] * alpha + ground * (1 - alpha);
  const b = pixels[idx + 2] * alpha + ground * (1 - alpha);
  const v = (r + g + b) / 3;
  return invert ? 255 - v : v;
}

function brightnessToChar(value: number, chars: string[]) {
  return chars[Math.floor(clamp(value, 0, 255) / 255 * (chars.length - 1))];
}

function quantize(value: number, levels: number) {
  if (levels <= 1) return { index: 0, value: 0 };
  const index = Math.round(clamp(value, 0, 255) / 255 * (levels - 1));
  return { index, value: index / (levels - 1) * 255 };
}

function convertOrdered(pixels: Uint8ClampedArray, width: number, height: number, chars: string[], invert: boolean) {
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
      ascii += brightnessToChar(pixelBrightness(pixels, idx, invert) + threshold, chars);
    }
    ascii += '\n';
  }
  return ascii;
}

function convertFloyd(pixels: Uint8ClampedArray, width: number, height: number, chars: string[], invert: boolean) {
  const values = new Array<number>(width * height);
  for (let i = 0; i < values.length; i++) values[i] = pixelBrightness(pixels, i * 4, invert);

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

  const { invert } = settings;
  if (settings.dither === 'ordered') return convertOrdered(pixels, width, height, chars, invert);
  if (settings.dither === 'floyd') return convertFloyd(pixels, width, height, chars, invert);

  let ascii = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ascii += brightnessToChar(pixelBrightness(pixels, (y * width + x) * 4, invert), chars);
    }
    ascii += '\n';
  }
  return ascii;
}

let probe: CanvasRenderingContext2D | null = null;

/** Whether a CSS color is light, so text in it reads bright on its ground. */
export function isLightInk(color: string): boolean {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return false;
  // Painting it resolves any CSS color syntax (color-mix, oklab) to sRGB.
  probe.clearRect(0, 0, 1, 1);
  // An invalid color leaves fillStyle as it was: reset it so that reads dark.
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return 0.299 * r + 0.587 * g + 0.114 * b > 128;
}

export interface AsciiBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws converted text onto a canvas so its cols × rows cells fill `box`
 * exactly, the layout the converter's <pre> gets from CSS: the font sized so a
 * row spans the width, rows spread to fill the height. One fillText per row.
 */
export function drawAscii(
  ctx: CanvasRenderingContext2D,
  text: string,
  cols: number,
  box: AsciiBox,
  style: { fontFamily: string; ink: string },
) {
  const lines = text.replace(/\n$/, '').split('\n');
  // Measured every call: cheap, and right even after a web font swaps in.
  ctx.font = `100px ${style.fontFamily}`;
  const advance = ctx.measureText('M').width / 100;
  const lineHeight = box.height / lines.length;
  ctx.font = `${box.width / (cols * advance)}px ${style.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.ink;
  lines.forEach((line, i) => ctx.fillText(line, box.x, box.y + (i + 0.5) * lineHeight));
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

// A web font that swaps in changes the advance: measure again after it loads.
export function forgetFontMetrics() {
  monoRatioCache.clear();
}

// Picks a font-size such that charCount monospace glyphs span exactly
// containerWidth in target's real font stack — beats fixed 0.6-em heuristics.
export function calculateOptimalFontSize(containerWidth: number, charCount: number, target?: Element) {
  const fontFamily = target ? getComputedStyle(target).fontFamily : 'monospace';
  return containerWidth / charCount * measureMonoCharRatio(fontFamily);
}
