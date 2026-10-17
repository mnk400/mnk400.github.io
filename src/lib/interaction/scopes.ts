// A scope is the element a highlight paints inside, as that element's free
// pseudo-element at z-index -1: above the scope's own fill, below its content.
// A target's scope is its nearest ancestor that would otherwise hide or blur a
// box drawn further out: a frosted or filled surface, or a container that
// actually scrolls. CSS can also declare one (`highlight-scope` mixin).

export interface Scope {
  el: HTMLElement;
  slot: 'before' | 'after';
  /** Scrolls, so a box must stay inside its scrollable area. */
  scrolls: boolean;
}

const cache = new WeakMap<HTMLElement, Scope | null>();

// rgba(r, g, b, a), oklab(l a b / a) and color(srgb r g b / a): alpha is the
// channel after the colour's three (four for color(), which names its space).
export function isTransparent(color: string): boolean {
  if (color === 'transparent') return true;
  const parts = color.match(/\(([^)]*)\)/)?.[1].split(/[\s,/]+/).filter(Boolean) ?? [];
  const alphaIndex = color.startsWith('color(') ? 4 : 3;
  return parts.length > alphaIndex && parseFloat(parts[alphaIndex]) === 0;
}

function overflows(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
  if (!/auto|scroll/.test(cs.overflowX + cs.overflowY)) return false;
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}

function isScope(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  if (cs.getPropertyValue('--highlight-scope').trim() === 'on') return true;
  const backdrop = cs.backdropFilter || cs.getPropertyValue('-webkit-backdrop-filter');
  if (backdrop && backdrop !== 'none') return true;
  return overflows(el, cs) || !isTransparent(cs.backgroundColor);
}

function freeSlot(el: HTMLElement): Scope['slot'] | null {
  const free = (pseudo: string) => /^(none|normal)$/.test(getComputedStyle(el, pseudo).content);
  if (free('::before')) return 'before';
  if (free('::after')) return 'after';
  return null;
}

function prepare(el: HTMLElement): Scope | null {
  if (cache.has(el)) return cache.get(el) ?? null;
  const slot = freeSlot(el);
  const cs = getComputedStyle(el);
  const scope: Scope | null = slot && { el, slot, scrolls: /auto|scroll/.test(cs.overflowX + cs.overflowY) };
  if (scope) {
    if (cs.position === 'static') el.dataset.highlightStatic = '';
    el.dataset.highlightSlot = scope.slot;
  }
  cache.set(el, scope);
  return scope;
}

/** The scope a target paints in. Stops short of <body>: overlays outside
 * .wrapper (image zoom) get no highlight and keep their own hovers. */
export function scopeFor(target: HTMLElement): Scope | null {
  for (let node = target.parentElement; node && node !== document.body; node = node.parentElement) {
    if (cache.get(node) || isScope(node)) return prepare(node);
  }
  return null;
}
