// Hover highlight: one box per scope that glides between targets, grows out of
// and shrinks back toward the pointer, and leans toward it (after
// jespervos.com). Mouse, pen and keyboard focus; touch gets touch.ts instead.
// Bare text gets an accent box behind it; a surface gets a ring around it.
// See "Interaction grammar" in docs/style-dna.md.
import { HIGHLIGHT_TARGETS, NO_FOCUS, NO_HOVER } from './targets.ts';
import {
  BOX_KEYS, distanceToRects, dot, goalBox, lineMask, readTarget, scopeOrigin, targetRects,
  type Box, type Point, type Target,
} from './geometry.ts';
import type { Scope } from './scopes.ts';

export interface HighlighterConfig {
  /** Share of the remaining distance covered per 60fps frame. */
  follow: number;
  /** Max lean toward the pointer, px. Targets scale it via --highlight-magnet. */
  magnet: number;
  /** How far, px, the pointer may stray off a target before it lets go. */
  sticky: number;
}

const config: HighlighterConfig = { follow: 0.25, magnet: 8, sticky: 12 };

export function configure(next: Partial<HighlighterConfig>): void {
  Object.assign(config, next);
  wake();
}

interface Painted {
  scope: Scope;
  box: Box;
  kind: 'text' | 'surface';
  mask: string;
  /** Last settled-on box: exits shrink toward the pointer, kept near this. */
  anchor: Box;
}

const pointer = { x: 0, y: 0, inside: false, touch: false };
const painted = new Map<HTMLElement, Painted>();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// The loop idles once settled; size changes of the target wake it.
const resized = new ResizeObserver(() => wake());

let current: Target | null = null;
let focused: HTMLElement | null = null;
// After a click, layout under a still pointer can shift (a panel opens), and
// whatever lands there shouldn't light up until the pointer actually moves.
let held: Point | null = null;
let frame = 0;
let lastTime = 0;
let busyUntil = 0;

// --- targets ----------------------------------------------------------------

// Faded out or not taking the pointer (the search pill's trigger once its
// field opens) counts as gone.
function isLive(el: HTMLElement, skip: string): boolean {
  if (!el.isConnected || el.matches(skip)) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && parseFloat(cs.opacity) > 0.05;
}

function hoverTarget(node: Element | null): HTMLElement | null {
  const el = node?.closest<HTMLElement>(HIGHLIGHT_TARGETS) ?? null;
  return el && isLive(el, NO_HOVER) ? el : null;
}

function resolve(): HTMLElement | null {
  if (focused && isLive(focused, NO_FOCUS)) return focused;
  if (!pointer.inside || pointer.touch) return null;
  const hit = hoverTarget(document.elementFromPoint(pointer.x, pointer.y));
  if (held) return hit && hit === current?.el ? hit : null;
  if (hit) return hit;
  // Bridge the gaps between neighbours instead of blinking out.
  if (current && isLive(current.el, NO_HOVER)
      && distanceToRects(pointer, targetRects(current), current.padX) < config.sticky) {
    return current.el;
  }
  return null;
}

function setTarget(el: HTMLElement | null): void {
  if (el === (current?.el ?? null)) return;
  if (current) {
    current.el.removeAttribute('data-highlight-active');
    resized.unobserve(current.el);
  }
  // A target with nowhere to paint is treated as no target at all.
  current = el ? readTarget(el) : null;
  if (!current) return;
  current.el.setAttribute('data-highlight-active', current.fit === 'surface' ? 'surface' : 'text');
  resized.observe(current.el);
}

// --- painting ---------------------------------------------------------------

function local(scope: Scope): Point {
  const o = scopeOrigin(scope);
  return { x: pointer.x - o.x, y: pointer.y - o.y };
}

/** Moves `box` a step toward `goal`; true while it's still moving. */
function step(box: Box, goal: Box, k: number): boolean {
  let moving = false;
  for (const key of BOX_KEYS) {
    box[key] += (goal[key] - box[key]) * k;
    if (Math.abs(goal[key] - box[key]) > 0.1) moving = true;
    else box[key] = goal[key];
  }
  return moving;
}

// Where a leaving box shrinks to: the pointer, but held within sticky reach of
// where it was, so a fast exit doesn't drag it across the page.
function exitPoint(p: Painted): Point {
  const a = p.anchor;
  if (!pointer.inside || focused) return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const at = local(p.scope);
  const reach = config.sticky;
  return {
    x: Math.min(a.x + a.w + reach, Math.max(a.x - reach, at.x)),
    y: Math.min(a.y + a.h + reach, Math.max(a.y - reach, at.y)),
  };
}

function paint(p: Painted, visible: boolean): void {
  const { el } = p.scope;
  for (const key of BOX_KEYS) el.style.setProperty(`--highlight-${key}`, `${p.box[key]}px`);
  if (el.style.getPropertyValue('--highlight-mask') !== p.mask) el.style.setProperty('--highlight-mask', p.mask);
  el.dataset.highlightKind = p.kind;
  el.toggleAttribute('data-highlight-visible', visible);
}

function tick(now: number): void {
  frame = 0;
  const dt = lastTime ? Math.min(64, now - lastTime) : 16.667;
  lastTime = now;
  const reduced = reducedMotion.matches;
  const k = reduced ? 1 : 1 - Math.pow(1 - config.follow, dt / 16.667);
  let moving = false;

  setTarget(resolve());
  const active = current;

  if (active) {
    const lean = !focused && !reduced ? local(active.scope) : null;
    const rects = targetRects(active);
    const goal = goalBox(active, rects, lean, config.magnet);
    let p = painted.get(active.scope.el);
    if (!p) {
      // Arriving: grow out of the pointer, or snap into place for focus.
      p = { scope: active.scope, box: focused ? { ...goal } : dot(local(active.scope)), kind: 'text', mask: 'none', anchor: goal };
      painted.set(active.scope.el, p);
    }
    p.kind = active.fit === 'surface' ? 'surface' : 'text';
    p.mask = lineMask(active, rects);
    p.anchor = goal;
    moving = step(p.box, goal, k);
    paint(p, true);
  }

  for (const [el, p] of painted) {
    if (el === active?.scope.el) continue;
    if (!el.isConnected) {
      painted.delete(el);
      continue;
    }
    const still = !step(p.box, dot(exitPoint(p)), k);
    paint(p, false);
    if (still) painted.delete(el);
    else moving = true;
  }

  if (moving || now < busyUntil) frame = requestAnimationFrame(tick);
  else lastTime = 0;
}

function wake(): void {
  if (!frame) frame = requestAnimationFrame(tick);
}

// Keeps the loop running through a press or transition, which change a
// target's geometry without resizing it.
function stayBusy(ms: number): void {
  busyUntil = Math.max(busyUntil, performance.now() + ms);
  wake();
}

function reset(): void {
  setTarget(null);
  focused = null;
  held = null;
  for (const p of painted.values()) paint(p, false);
  painted.clear();
}

// --- wiring -------------------------------------------------------------------
// Registered once per session; reset() drops every page reference before a
// swap, so nothing here outlives its page.

// Lets CSS hand surface hover fills over to the ring (`hover-fallback` mixin)
// while a page without this module keeps them. Re-set after each swap, since
// ClientRouter copies the incoming document's <html> attributes.
const flagRoot = () => document.documentElement.setAttribute('data-highlighter', '');
flagRoot();
document.addEventListener('astro:after-swap', flagRoot);

window.addEventListener('pointermove', (e) => {
  pointer.touch = e.pointerType === 'touch';
  if (held && Math.hypot(e.clientX - held.x, e.clientY - held.y) > 2) held = null;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
  focused = null;
  wake();
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
  pointer.touch = e.pointerType === 'touch';
  stayBusy(300);
}, { passive: true });

window.addEventListener('click', () => {
  held = { x: pointer.x, y: pointer.y };
  stayBusy(300);
}, { capture: true, passive: true });

document.documentElement.addEventListener('pointerleave', () => {
  pointer.inside = false;
  wake();
});

window.addEventListener('scroll', wake, { passive: true, capture: true });
window.addEventListener('resize', wake, { passive: true });
// Entrances fade targets in (they don't count while faded), and transitions
// can move a target without resizing it.
document.addEventListener('transitionrun', () => stayBusy(400), { passive: true, capture: true });
document.addEventListener('animationend', wake, { passive: true, capture: true });

document.addEventListener('focusin', (e) => {
  const el = (e.target as Element).closest<HTMLElement>(HIGHLIGHT_TARGETS);
  if (el && el.matches(':focus-visible') && isLive(el, NO_FOCUS)) {
    focused = el;
    wake();
  }
});

document.addEventListener('focusout', () => {
  if (!focused) return;
  focused = null;
  wake();
});

document.addEventListener('astro:before-swap', reset);
document.addEventListener('astro:page-load', wake);
