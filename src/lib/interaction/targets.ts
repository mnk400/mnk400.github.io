// What the site treats as interactive, for the hover highlighter.

/** Elements the highlighter tracks. A link that wraps an image (cards, the
 * music widget) opts in with data-highlight when it wants a highlight. */
export const HIGHLIGHT_TARGETS = [
  'a[href]:not(:has(img))',
  'button',
  'select',
  'input[type="range"]',
  'input[type="color"]',
  // Text fields, unless a [data-highlight] field (the search pill) wraps them.
  'input:is([type="text"], [type="email"], [type="url"]):not([data-highlight] *)',
  '.btn',
  '[data-highlight]',
].join(', ');

/** No hover highlight. [data-highlight-ignore] marks a child with its own
 * hover (an album-art charm) that hides its parent's highlight while hovered.
 * Selected things do take it: their dark fill hands over to a solid box. */
export const NO_HOVER = [
  '[data-highlight="off"]',
  ':disabled',
  '[aria-disabled="true"]',
  ':has([data-highlight-ignore]:hover)',
].join(', ');

/** No focus highlight. */
export const NO_FOCUS = '[data-highlight="off"], :disabled';
