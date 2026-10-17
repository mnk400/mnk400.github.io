// Tap feedback on touch screens, which get no hover highlight. A tapped target
// carries .touch-hover for at least 150ms, which the hover-fallback and
// hover-interactive mixins style like a hover.
import { TAP_TARGETS } from './targets.ts';

const MIN_VISIBLE_MS = 150;

if ('ontouchstart' in window) {
  let active: Element | null = null;
  let startedAt = 0;

  document.addEventListener('touchstart', (e) => {
    active = (e.target as Element).closest(TAP_TARGETS);
    if (!active) return;
    startedAt = Date.now();
    active.classList.add('touch-hover');
  }, { passive: true });

  const end = () => {
    if (!active) return;
    const target = active;
    active = null;
    setTimeout(() => target.classList.remove('touch-hover'), Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt)));
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
}
