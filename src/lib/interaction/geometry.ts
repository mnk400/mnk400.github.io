// Measuring targets and turning them into highlight boxes. Everything here is
// a pure read of layout; the loop in highlighter.ts owns state and painting.
import { isTransparent, scopeFor, type Scope } from './scopes.ts';

// text: hug the glyphs. box: the element's own box (rows). surface: a box a
// little bigger than the element that stretches toward the pointer instead of
// sliding.
export type Fit = 'text' | 'box' | 'surface';

// wash: a light box, text turns accent. solid: an accent box, text keeps its
// colour. keep: the element keeps its fill and colours. tint: the box paints
// over the element (album art). 'text' is the look of text and rows unless
// they're solid.
export type Tone = 'wash' | 'solid' | 'keep' | 'tint';
export type Look = 'text' | Tone;

/** A target's look. Read every frame, since selecting a target under a still
 * pointer changes it (wash to solid). */
export function lookOf(el: HTMLElement, fit: Fit): Look {
  const tone = getComputedStyle(el).getPropertyValue('--highlight-tone').trim();
  if (tone === 'solid') return 'solid';
  if (fit !== 'surface') return 'text';
  return tone === 'keep' || tone === 'tint' ? tone : 'wash';
}

export interface Target {
  el: HTMLElement;
  scope: Scope;
  fit: Fit;
  look: Look;
  inline: boolean;
  /** An icon with no text (the breadcrumb back arrow): gets a round box. */
  iconOnly: boolean;
  padX: number;
  padY: number;
  /** Fixed radius, or null to derive one from the box's height. */
  radius: number | null;
  magnet: number;
}

/** A box in scope coordinates. */
export interface Box { x: number; y: number; w: number; h: number; r: number }

export interface Point { x: number; y: number }

export const BOX_KEYS = ['x', 'y', 'w', 'h', 'r'] as const;

export const dot = (p: Point): Box => ({ x: p.x, y: p.y, w: 0, h: 0, r: 0 });

const ICON_PAD = 6;

const DEFAULTS: Record<Fit, { padX: number; padY: number; magnet: number }> = {
  text: { padX: 4, padY: 2, magnet: 0.35 },
  box: { padX: 10, padY: 6, magnet: 1 },
  surface: { padX: 3, padY: 3, magnet: 0.6 },
};

// A focus ring is an outline too, but it doesn't make a link a surface.
function isSurface(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
  if (!isTransparent(cs.backgroundColor)) return true;
  return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !el.matches(':focus-visible');
}

/** Reads a target's tuning (the `highlight-*` mixins set it), or null when
 * it has nowhere to paint. */
export function readTarget(el: HTMLElement): Target | null {
  const scope = scopeFor(el);
  if (!scope) return null;
  const cs = getComputedStyle(el);
  const declared = cs.getPropertyValue('--highlight-fit').trim();
  const fit: Fit = declared === 'text' || declared === 'box' || declared === 'surface'
    ? declared
    : isSurface(el, cs) ? 'surface' : 'text';
  const inline = cs.display === 'inline';
  const d = DEFAULTS[fit];
  const num = (name: string, fallback: number) => {
    const value = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  // An icon's rect is all ink, where a text run's carries the line's leading
  // above and below; so an icon gets more room, and a circle (goalBox).
  const iconOnly = fit === 'text' && !el.textContent?.trim();
  // Prose links sit a comma's width apart; 3px keeps the box off the comma.
  const padX = num('--highlight-pad-x', iconOnly ? ICON_PAD : fit === 'text' && inline ? 3 : d.padX);
  let radius: number | null = num('--highlight-radius', NaN);
  if (!Number.isFinite(radius)) {
    // A surface's box stays concentric with the corners it covers.
    const height = el.getBoundingClientRect().height;
    radius = fit === 'surface' ? Math.min(parseFloat(cs.borderTopLeftRadius) || 0, height / 2) + padX
      : fit === 'box' ? 8 : null;
  }
  return {
    el,
    scope,
    fit,
    look: lookOf(el, fit),
    inline,
    iconOnly,
    padX,
    padY: num('--highlight-pad-y', iconOnly ? ICON_PAD : d.padY),
    radius,
    magnet: num('--highlight-magnet', d.magnet),
  };
}

const visible = (el: Element) => getComputedStyle(el).visibility !== 'hidden';

// Union of visible text runs and icons. Measuring content rather than the
// element skips boxes that only reserve space (the footer's label slot, sized
// for the longer of "settings" and "close") and enlarged tap areas.
function contentRect(el: HTMLElement): DOMRect | null {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const add = (r: DOMRect) => {
    if (!r.width || !r.height) return;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  };
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || (node.parentElement && !visible(node.parentElement))) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) add(r);
  }
  el.querySelectorAll('svg, img').forEach((icon) => visible(icon) && add(icon.getBoundingClientRect()));
  return left === Infinity ? null : new DOMRect(left, top, right - left, bottom - top);
}

/** What a target occupies, in viewport coordinates: one rect per line for
 * wrapped inline text, otherwise one. */
export function targetRects(t: Target): DOMRect[] {
  if (t.fit !== 'text') return [t.el.getBoundingClientRect()];
  if (t.inline) {
    const lines = [...t.el.getClientRects()].filter((r) => r.width > 0);
    if (lines.length) return lines;
  }
  return [contentRect(t.el) ?? t.el.getBoundingClientRect()];
}

export function distanceToRects(p: Point, rects: DOMRect[], pad = 0): number {
  let best = Infinity;
  for (const r of rects) {
    const dx = Math.max(r.left - pad - p.x, 0, p.x - r.right - pad);
    const dy = Math.max(r.top - pad - p.y, 0, p.y - r.bottom - pad);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

export function scopeOrigin(scope: Scope): Point {
  const r = scope.el.getBoundingClientRect();
  return {
    x: r.left + scope.el.clientLeft - scope.el.scrollLeft,
    y: r.top + scope.el.clientTop - scope.el.scrollTop,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The box a target's highlight settles on, in its scope's coordinates. With
 * a pointer (scope coordinates) it leans toward it: text and rows slide,
 * surfaces stretch their near edge. `magnet` is the configured max lean. */
export function goalBox(t: Target, rects: DOMRect[], pointer: Point | null, magnet: number): Box {
  const o = scopeOrigin(t.scope);
  const left = Math.min(...rects.map((r) => r.left)) - o.x;
  const top = Math.min(...rects.map((r) => r.top)) - o.y;
  const right = Math.max(...rects.map((r) => r.right)) - o.x;
  const bottom = Math.max(...rects.map((r) => r.bottom)) - o.y;
  const box: Box = {
    x: left - t.padX,
    y: top - t.padY,
    w: right - left + t.padX * 2,
    h: bottom - top + t.padY * 2,
    r: 0,
  };
  if (t.iconOnly) {
    const side = Math.max(box.w, box.h);
    box.x -= (side - box.w) / 2;
    box.y -= (side - box.h) / 2;
    box.w = box.h = side;
  }
  box.r = t.radius ?? (t.iconOnly ? box.w / 2 : clamp(box.h / 5, 4, 6));

  if (pointer) {
    // Per axis, so a wide bar leans vertically as readily as horizontally.
    const nx = clamp((pointer.x - (box.x + box.w / 2)) / (box.w / 2 + 24), -1, 1);
    const ny = clamp((pointer.y - (box.y + box.h / 2)) / (box.h / 2 + 24), -1, 1);
    const max = magnet * t.magnet;
    if (t.fit === 'surface') {
      // At most 2px whatever the size, so it stays clear of neighbours.
      const reach = Math.min(max, 2);
      const lx = nx * reach, ly = ny * reach;
      if (lx < 0) box.x += lx;
      if (ly < 0) box.y += ly;
      box.w += Math.abs(lx);
      box.h += Math.abs(ly);
    } else {
      // A row inset from its card keeps 2px clear of the card's edge; text
      // never slides further than its own pad uncovers.
      const reachX = t.padX < 0 ? Math.max(0, -t.padX - 2) : max;
      const reachY = t.fit === 'text' ? Math.min(max, t.padY + 1) : Math.max(0, Math.min(max, -t.padY - 2));
      box.x += nx * reachX;
      box.y += ny * reachY;
    }
  }

  // A box overhanging a scroll container would grow its scrollable area.
  if (t.scope.scrolls) {
    const el = t.scope.el;
    const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
    box.w = Math.max(0, Math.min(box.x + box.w, el.scrollWidth) - x0);
    box.h = Math.max(0, Math.min(box.y + box.h, el.scrollHeight) - y0);
    box.x = x0;
    box.y = y0;
  }
  return box;
}

/** A mask painting one rounded rect per line, for a link that wraps; 'none'
 * for anything on one line. Drawn in the unleaned box's coordinates and
 * stretched to the box, so it rides along as the box slides. */
export function lineMask(t: Target, rects: DOMRect[]): string {
  if (rects.length < 2) return 'none';
  const left = Math.min(...rects.map((r) => r.left)) - t.padX;
  const top = Math.min(...rects.map((r) => r.top)) - t.padY;
  const width = Math.max(...rects.map((r) => r.right)) + t.padX - left;
  const height = Math.max(...rects.map((r) => r.bottom)) + t.padY - top;
  const radius = t.radius ?? 4;
  const shapes = rects.map((r) =>
    `<rect x='${r.left - t.padX - left}' y='${r.top - t.padY - top}' width='${r.width + t.padX * 2}' height='${r.height + t.padY * 2}' rx='${radius}'/>`,
  ).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='none'>${shapes}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
