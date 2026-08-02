// Client-side lifecycle helpers for View Transitions.
//
// `<ClientRouter />` swaps the DOM without a reload, so module scripts run once
// per session while `astro:page-load` fires on every navigation. Anything bound
// to `document`, `window`, or an observer therefore accumulates unless it is
// explicitly torn down — and the leaked closure keeps the detached DOM alive.
//
// An element-scoped listener dies with its element and needs none of this. A
// `dataset.initialized` guard does NOT substitute: after a swap the element is
// a new node, so init runs again against fresh markup.

let controller: AbortController | null = null;

/**
 * An AbortSignal that aborts on the next view-transition swap.
 *
 * Pass it to any `document`/`window` listener registered from page setup:
 *
 *     document.addEventListener('keydown', onKey, { signal: pageSignal() });
 *
 * A fresh signal is minted per page, so setup code can call this freely.
 */
export function pageSignal(): AbortSignal {
  controller ??= new AbortController();
  return controller.signal;
}

/**
 * Runs `fn` when the current page is swapped away. For teardown that isn't an
 * event listener — observers, timers, media streams:
 *
 *     const observer = new ResizeObserver(update);
 *     untilSwap(() => observer.disconnect());
 */
export function untilSwap(fn: () => void): void {
  pageSignal().addEventListener('abort', fn, { once: true });
}

document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
});
