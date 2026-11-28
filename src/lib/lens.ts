// The lens: a soft hole in an overlay that shows what's beneath it, carried
// by the pointer. Touch has no hover, so a held touch hides the overlay
// instead. Styles: the `lens-overlay` mixin in pages/_tools.scss.

// A touch held this long peeks; shorter is a tap.
const HOLD_MS = 250;
// A held touch that drifts this far is a scroll, not a peek.
const HOLD_SLOP = 10;

export interface Lens {
  /** True once after a touch hold, so the tap that ends it can be skipped. */
  consumeHold(): boolean;
}

/** Listeners are on `el` itself, so they go when it does; `signal` (the
 * mount's) clears a hold still pending at swap. */
export function attachLens(el: HTMLElement, signal: AbortSignal): Lens {
  let timer = 0;
  signal.addEventListener('abort', () => window.clearTimeout(timer));
  let held = false;
  let start = { x: 0, y: 0 };

  const release = () => {
    window.clearTimeout(timer);
    el.classList.remove('is-revealed');
  };

  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > HOLD_SLOP) release();
      return;
    }
    const box = el.getBoundingClientRect();
    el.style.setProperty('--lens-x', `${e.clientX - box.left}px`);
    el.style.setProperty('--lens-y', `${e.clientY - box.top}px`);
    el.classList.add('is-peeking');
  });
  el.addEventListener('pointerleave', () => el.classList.remove('is-peeking'));

  el.addEventListener('pointerdown', (e) => {
    held = false;
    if (e.pointerType !== 'touch') return;
    start = { x: e.clientX, y: e.clientY };
    timer = window.setTimeout(() => {
      held = true;
      el.classList.add('is-revealed');
    }, HOLD_MS);
  });
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('contextmenu', (e) => { if (held) e.preventDefault(); });

  return {
    consumeHold() {
      const was = held;
      held = false;
      return was;
    },
  };
}
