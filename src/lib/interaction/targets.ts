// What the site treats as interactive. One list feeds both the hover
// highlighter and touch tap feedback, so the two can't drift apart.

/** Elements the highlighter tracks. A link that wraps an image (cards, the
 * music widget) opts in with data-highlight when it wants a highlight. */
export const HIGHLIGHT_TARGETS = [
  'a[href]:not(:has(img))',
  'button',
  'select',
  'input[type="range"]',
  'input[type="color"]',
  '.btn',
  '[data-highlight]',
].join(', ');

/** Elements that get the .touch-hover class on tap: every target, plus links
 * around images, whose hover styles (reveal cards) double as tap feedback. */
export const TAP_TARGETS = `${HIGHLIGHT_TARGETS}, a[href]`;

/** No hover highlight. Selection is read from ARIA state; selected things take
 * no hover. [data-highlight-ignore] marks a child with its own hover (an
 * album-art charm) that hides its parent's highlight while hovered. */
export const NO_HOVER = [
  '[data-highlight="off"]',
  ':disabled',
  '[aria-disabled="true"]',
  '[aria-selected="true"]',
  '[aria-pressed="true"]',
  ':has([data-highlight-ignore]:hover)',
].join(', ');

/** No focus highlight. Selected things keep theirs: it's the focus ring. */
export const NO_FOCUS = '[data-highlight="off"], :disabled';
