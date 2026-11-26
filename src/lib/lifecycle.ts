// Client-side lifecycle for View Transitions.
//
// `<ClientRouter />` swaps the DOM without a reload, so module scripts run once
// per session while `astro:page-load` fires on every navigation. Anything bound
// to `document`, `window`, or an observer therefore accumulates unless it is
// torn down on swap, and the leaked closure keeps the detached DOM alive.
//
// `mount()` is the entry point for page and component scripts. `pageSignal()`
// and `untilSwap()` are the primitives it is built on, for code that runs
// outside a mount (shared libs called from one).

let controller: AbortController | null = null;

/** An AbortSignal that aborts on the next swap. A fresh one is minted per page. */
export function pageSignal(): AbortSignal {
  controller ??= new AbortController();
  return controller.signal;
}

/** Runs `fn` when the current page is swapped away (observers, timers, streams). */
export function untilSwap(fn: () => void): void {
  pageSignal().addEventListener('abort', fn, { once: true });
}

document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
});

export interface MountContext {
  root: HTMLElement;
  /** Aborts on swap: pass to every `document`/`window` listener. */
  signal: AbortSignal;
  /** The one `[data-ref="name"]` inside root. Throws if there are none or several. */
  ref<T extends HTMLElement = HTMLElement>(name: string): T;
  /** The first match for a CSS selector inside root. Throws if none. */
  find<T extends Element = HTMLElement>(selector: string): T;
}

// Roots already set up. Pages are swapped wholesale, so a root is only ever
// seen again if a mount's selector matches it twice on the same page.
const mounted = new WeakSet<Element>();

/**
 * On every page, runs `setup` once for each element matching `selector`.
 * Setup may return a cleanup function (run on swap) or a promise (an async
 * setup; a rejection is logged like a throw). One failing mount is logged
 * without stopping the others.
 *
 *     mount('[data-mount="gradient"]', ({ ref, signal }) => {
 *       const color = ref<HTMLInputElement>('color');
 *       window.addEventListener('resize', redraw, { signal });
 *       return () => stopAnimation();
 *     });
 */
export function mount(
  selector: string,
  setup: (ctx: MountContext) => void | (() => void) | Promise<unknown>,
): void {
  const report = (error: unknown) => console.error(`mount(${selector}) failed:`, error);

  document.addEventListener('astro:page-load', () => {
    for (const root of document.querySelectorAll<HTMLElement>(selector)) {
      if (mounted.has(root)) continue;
      mounted.add(root);

      const ref = <T extends HTMLElement>(name: string): T => {
        const found = root.querySelectorAll<T>(`[data-ref="${name}"]`);
        if (found.length !== 1) throw new Error(`expected one [data-ref="${name}"], found ${found.length}`);
        return found[0];
      };
      const find = <T extends Element>(query: string): T => {
        const found = root.querySelector<T>(query);
        if (!found) throw new Error(`nothing matches ${query}`);
        return found;
      };

      try {
        const result = setup({ root, signal: pageSignal(), ref, find });
        if (typeof result === 'function') untilSwap(result);
        else if (result instanceof Promise) result.catch(report);
      } catch (error) {
        report(error);
      }
    }
  });
}
