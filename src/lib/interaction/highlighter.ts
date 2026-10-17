// Hover highlight: one box per scope that glides between targets and leans
// toward the pointer, for mouse, pen and keyboard focus (touch: touch.ts).
// Rules in docs/style-dna.md "Interaction grammar".
import { HIGHLIGHT_TARGETS, NO_FOCUS, NO_HOVER } from './targets.ts';
import {
  BOX_KEYS, distanceToRects, dot, goalBox, lineMask, lookOf, readTarget, scopeOrigin, targetRects,
  type Box, type Look, type Point, type Target,
} from './geometry.ts';
import type { Scope } from './scopes.ts';

const config = {
  /** Share of the remaining distance covered per 60fps frame. */
  follow: 0.25,
  /** Max lean toward the pointer, px. Targets scale it via --highlight-magnet. */
  magnet: 8,
  /** How far, px, the pointer may stray off a target before it lets go. */
  sticky: 12,
};

interface Painted {
  scope: Scope;
  box: Box;
  kind: Look;
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
// whatever lands there shouldn't light up until the pointer actually moves,
// unless the clicked target gave way to it (the search trigger to its field).
let held: (Point & { el: HTMLElement | null }) | null = null;
// Surfaces under the box, which get --highlight-cover (0-1) to fade their fill.
const covered = new Map<HTMLElement, Scope>();
let frame = 0;
let lastTime = 0;
let busyUntil = 0;

// --- targets ----------------------------------------------------------------

// Faded out or not taking the pointer (the search pill's trigger once its
// field opens) counts as gone.
function isLive(el: HTMLElement, skip: string): boolean {
  if (!el.isConnected || el.matches(skip)) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && parseFloat(cs.opacity) > 0;
}

function hoverTarget(node: Element | null): HTMLElement | null {
  const el = node?.closest<HTMLElement>(HIGHLIGHT_TARGETS) ?? null;
  return el && isLive(el, NO_HOVER) ? el : null;
}

function resolve(): HTMLElement | null {
  if (focused && isLive(focused, NO_FOCUS)) return focused;
  if (!pointer.inside || pointer.touch) return null;
  const hit = hoverTarget(document.elementFromPoint(pointer.x, pointer.y));
  if (held) {
    const gaveWay = held.el && !isLive(held.el, NO_HOVER);
    if (hit && (hit === held.el || gaveWay)) return hit;
    // Hold the box over the gap until the clicked target's successor shows.
    return gaveWay && performance.now() < busyUntil ? current?.el ?? null : null;
  }
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
  current.el.setAttribute('data-highlight-active', current.look);
  resized.observe(current.el);
}

// Selecting the target under the pointer turns its wash solid.
function refreshLook(t: Target): void {
  const look = lookOf(t.el, t.fit);
  if (look === t.look) return;
  t.look = look;
  t.el.setAttribute('data-highlight-active', look);
}

// --- painting ---------------------------------------------------------------

function coverage(el: HTMLElement, scope: Scope, box: Box): number {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return 0;
  const o = scopeOrigin(scope);
  const w = Math.min(r.right - o.x, box.x + box.w) - Math.max(r.left - o.x, box.x);
  const h = Math.min(r.bottom - o.y, box.y + box.h) - Math.max(r.top - o.y, box.y);
  return w > 0 && h > 0 ? Math.min(1, (w * h) / (r.width * r.height)) : 0;
}

function trackCover(): void {
  // A solid row has a fill to hand over too (a selected dropdown option).
  if (current && current.look !== 'keep' && (current.fit === 'surface' || current.look === 'solid')) {
    covered.set(current.el, current.scope);
  }
  for (const [el, scope] of covered) {
    const p = painted.get(scope.el);
    const c = p && el.isConnected ? coverage(el, scope, p.box) : 0;
    if (c > 0.001) {
      el.style.setProperty('--highlight-cover', c.toFixed(3));
    } else {
      el.style.removeProperty('--highlight-cover');
      covered.delete(el);
    }
  }
}

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
// where it was, so a fast exit doesn't drag it across the page. In a scroller
// it stays inside its last box, which would otherwise grow the scroll area.
function exitPoint(p: Painted): Point {
  const a = p.anchor;
  if (!pointer.inside || focused) return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const at = local(p.scope);
  const reach = p.scope.scrolls ? 0 : config.sticky;
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
    refreshLook(active);
    const lean = !focused && !reduced ? local(active.scope) : null;
    const rects = targetRects(active);
    const goal = goalBox(active, rects, lean, config.magnet);
    let p = painted.get(active.scope.el);
    if (!p) {
      // Arriving: grow out of the pointer, or snap into place for focus.
      p = { scope: active.scope, box: focused ? { ...goal } : dot(local(active.scope)), kind: 'text', mask: 'none', anchor: goal };
      painted.set(active.scope.el, p);
    }
    p.kind = active.look;
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

  trackCover();
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
  covered.clear();
}

// --- wiring -------------------------------------------------------------------
// Registered once per session; reset() drops every page reference before a
// swap, so nothing here outlives its page.

// Turns off the hover-fallback hovers. Re-set after each swap, since
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
  held = { x: pointer.x, y: pointer.y, el: current?.el ?? null };
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

// The focused element may sit inside its target (a gallery tile's image).
document.addEventListener('focusin', (e) => {
  const node = e.target as Element;
  const el = node.closest<HTMLElement>(HIGHLIGHT_TARGETS);
  if (el && node.matches(':focus-visible') && isLive(el, NO_FOCUS)) {
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
