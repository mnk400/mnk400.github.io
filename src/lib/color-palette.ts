// Dominant-color extraction: k-means in Oklab over a downscaled sample.

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  /** Share of sampled pixels this color's cluster covers, 0–1. */
  weight: number;
}

export interface PaletteOptions {
  count?: number;
  /** Long-edge size of the downscaled sample. Cost scales with its square. */
  sampleSize?: number;
}

const DEFAULT_COUNT = 5;
const DEFAULT_SAMPLE_SIZE = 96;
// Lloyd's rarely reaches zero churn on photographic data, so this cap is the
// usual stop. Loosening it into an early-out changes which pixels land in
// which cluster, and with them the palette.
const MAX_ITERATIONS = 24;
const MIN_ALPHA = 128;

// Cluster finer than asked, then select, so a vivid minority isn't absorbed
// into a dull neighbour before selection sees it.
const POOL_FACTOR = 3;
const MAX_POOL = 16;

// Below 1, clusters key on hue rather than on light-vs-dark.
const LIGHTNESS_WEIGHT = 0.325;

// Where in its cluster's chroma range a representative is drawn from. Higher
// backfires: a photo's highest-chroma pixels are usually its dark saturated
// ones, so chasing chroma drags the palette toward black.
const CHROMA_PERCENTILE = 0.55;

// Coverage is flattened, then scaled by chroma relative to this image. The
// swing is deliberately modest, tilt further and a dominant neutral (white
// paper) can never win a slot.
const COVERAGE_EXPONENT = 0.5;
const CHROMA_FLOOR = 0.6;
const CHROMA_GAIN = 0.8;
const MIN_CHROMA_SCALE = 0.02;

// Lightness counts half when judging duplicates: two tints of one hue read as
// more alike than their Oklab distance suggests.
const SEPARATION_LIGHTNESS_WEIGHT = 0.5;

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  SRGB_TO_LINEAR[i] = v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/** Perceived luminance (Rec. 709), picks readable text over a swatch. */
export function isLightColor(r: number, g: number, b: number): boolean {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
}

let scratch: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

/**
 * Draw `image` downscaled and read its pixels. Null when the image has no
 * intrinsic size yet, or the canvas is tainted (cross-origin, no CORS).
 */
function samplePixels(image: HTMLImageElement, sampleSize: number): ImageData | null {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) return null;

  const scale = Math.min(1, sampleSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  if (!scratch) {
    scratch = document.createElement('canvas');
    scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
  }
  if (!scratchCtx) return null;
  scratch.width = w;
  scratch.height = h;

  // Point sampling, not the default smooth resample: interpolation invents
  // colors that are nowhere in the image.
  scratchCtx.imageSmoothingEnabled = false;
  scratchCtx.drawImage(image, 0, 0, w, h);
  try {
    return scratchCtx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
}

/**
 * Interleaved Oklab triples plus per-pixel chroma. Every opaque pixel is kept,
 * so cluster sizes are true coverage rather than counts of distinct colors.
 */
function toOklab(pixels: Uint8ClampedArray) {
  const total = pixels.length >> 2;
  const data = new Float32Array(total * 3);
  const chroma = new Float32Array(total);
  let n = 0;

  for (let i = 0, o = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < MIN_ALPHA) continue;

    const rl = SRGB_TO_LINEAR[pixels[i]];
    const gl = SRGB_TO_LINEAR[pixels[i + 1]];
    const bl = SRGB_TO_LINEAR[pixels[i + 2]];

    const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);

    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    data[o++] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    data[o++] = a;
    data[o++] = b;
    chroma[n] = Math.sqrt(a * a + b * b);
    n++;
  }

  return { data, chroma, count: n };
}

function oklabToRgb(L: number, a: number, bVal: number) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bVal;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bVal;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bVal;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  r = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  g = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  b = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1 / 2.4) - 0.055;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

/** Deterministic, so the same image always yields the same palette. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * k-means++ seeding then Lloyd's, over interleaved Oklab triples. Distances
 * stay squared, same ordering, no `Math.sqrt` in the inner loop.
 */
function kMeans(data: Float32Array, n: number, k: number, centroids: Float32Array, assign: Int32Array) {
  const random = mulberry32(0x9e3779b9);
  const nearest = new Float32Array(n);
  const counts = new Int32Array(k);
  const sums = new Float64Array(k * 3);
  const lw2 = LIGHTNESS_WEIGHT * LIGHTNESS_WEIGHT;

  const first = Math.min(n - 1, Math.floor(random() * n)) * 3;
  centroids[0] = data[first];
  centroids[1] = data[first + 1];
  centroids[2] = data[first + 2];

  for (let i = 0; i < n; i++) {
    const dl = data[i * 3] - centroids[0];
    const da = data[i * 3 + 1] - centroids[1];
    const db = data[i * 3 + 2] - centroids[2];
    nearest[i] = dl * dl * lw2 + da * da + db * db;
  }

  // Each new center is drawn with probability proportional to its squared
  // distance from the nearest existing one.
  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let i = 0; i < n; i++) total += nearest[i];

    let pick = Math.min(n - 1, Math.floor((c * n) / k));
    if (total > 0) {
      let target = random() * total;
      for (let i = 0; i < n; i++) {
        target -= nearest[i];
        if (target <= 0) { pick = i; break; }
      }
    }

    const cl = data[pick * 3];
    const ca = data[pick * 3 + 1];
    const cb = data[pick * 3 + 2];
    centroids[c * 3] = cl;
    centroids[c * 3 + 1] = ca;
    centroids[c * 3 + 2] = cb;

    for (let i = 0; i < n; i++) {
      const dl = data[i * 3] - cl;
      const da = data[i * 3 + 1] - ca;
      const db = data[i * 3 + 2] - cb;
      const d = dl * dl * lw2 + da * da + db * db;
      if (d < nearest[i]) nearest[i] = d;
    }
  }

  assign.fill(-1);
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    counts.fill(0);
    sums.fill(0);
    let changed = false;

    for (let i = 0; i < n; i++) {
      const pl = data[i * 3];
      const pa = data[i * 3 + 1];
      const pb = data[i * 3 + 2];

      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dl = pl - centroids[c * 3];
        const da = pa - centroids[c * 3 + 1];
        const db = pb - centroids[c * 3 + 2];
        const d = dl * dl * lw2 + da * da + db * db;
        if (d < bestDist) { bestDist = d; best = c; }
      }

      if (assign[i] !== best) { assign[i] = best; changed = true; }
      counts[best]++;
      sums[best * 3] += pl;
      sums[best * 3 + 1] += pa;
      sums[best * 3 + 2] += pb;
    }

    if (!changed) break;

    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      centroids[c * 3] = sums[c * 3] / counts[c];
      centroids[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
      centroids[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
    }
  }
}

interface Candidate {
  L: number;
  a: number;
  b: number;
  chroma: number;
  weight: number;
}

/**
 * One color per cluster: a real member near the top of its own chroma range,
 * not the centroid. Averaging in Oklab cancels opposing hues and pulls
 * lightness to the middle, reporting colors that appear nowhere in the image.
 */
function describeClusters(data: Float32Array, chroma: Float32Array, n: number, k: number, assign: Int32Array): Candidate[] {
  const buckets: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) buckets[assign[i]].push(i);

  const candidates: Candidate[] = [];
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    bucket.sort((x, y) => chroma[x] - chroma[y]);
    const pick = bucket[Math.floor(CHROMA_PERCENTILE * (bucket.length - 1))];
    candidates.push({
      L: data[pick * 3],
      a: data[pick * 3 + 1],
      b: data[pick * 3 + 2],
      chroma: chroma[pick],
      weight: bucket.length / n,
    });
  }
  return candidates;
}

function separation(x: Candidate, y: Candidate): number {
  const dl = (x.L - y.L) * SEPARATION_LIGHTNESS_WEIGHT;
  const da = x.a - y.a;
  const db = x.b - y.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Rank by chroma-scaled coverage, then pick greedily by score × distance from
 * everything already chosen, so near-duplicates don't take two slots. Ranking
 * on coverage alone hands the palette to shadow and haze.
 */
function selectPalette(candidates: Candidate[], count: number, scale: number): Candidate[] {
  const remaining = candidates.map((candidate) => ({
    candidate,
    score:
      Math.pow(candidate.weight, COVERAGE_EXPONENT) *
      (CHROMA_FLOOR + CHROMA_GAIN * Math.min(1, candidate.chroma / scale)),
  }));

  const chosen: Candidate[] = [];
  while (chosen.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const { candidate, score } = remaining[i];
      let value = score;
      for (const other of chosen) value = Math.min(value, score * separation(candidate, other));
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }

    chosen.push(remaining[bestIndex].candidate);
    remaining.splice(bestIndex, 1);
  }

  return chosen;
}

/**
 * Dominant colors, most-dominant first. Empty when the canvas is tainted
 * (cross-origin without CORS), treat as "no palette", not an error. Every
 * color returned is an actual pixel of the source.
 */
export function extractPalette(image: HTMLImageElement, options: PaletteOptions = {}): PaletteColor[] {
  const { count = DEFAULT_COUNT, sampleSize = DEFAULT_SAMPLE_SIZE } = options;

  const k = Math.max(1, Math.floor(count));
  const sampled = samplePixels(image, Math.max(1, Math.floor(sampleSize)));
  if (!sampled) return [];

  const { data, chroma, count: n } = toOklab(sampled.data);
  if (n === 0) return [];

  const pool = Math.min(n, Math.max(k, Math.min(k * POOL_FACTOR, MAX_POOL)));
  const centroids = new Float32Array(pool * 3);
  const assign = new Int32Array(n);
  kMeans(data, n, pool, centroids, assign);

  // How colorful this image gets, so candidates are judged against their own
  // source: chroma 0.05 is drab in a neon sign, vivid in an overcast landscape.
  const sortedChroma = chroma.slice(0, n).sort();
  const scale = Math.max(sortedChroma[Math.floor(0.95 * (n - 1))], MIN_CHROMA_SCALE);

  return selectPalette(describeClusters(data, chroma, n, pool, assign), k, scale)
    .sort((x, y) => y.weight - x.weight)
    .map(({ L, a, b, weight }) => {
      const rgb = oklabToRgb(L, a, b);
      return { ...rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b), weight };
    });
}
