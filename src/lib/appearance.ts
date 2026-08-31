import { applyTheme, getActiveTheme } from './theme';
import { applyFont, getActiveFont } from './font';

// Session-wide lifecycle: every route needs appearance state, even when it
// doesn't render the homepage's settings controls. No page DOM is retained.
function applyAppearance(doc: Document = document) {
  applyTheme(getActiveTheme(), doc);
  applyFont(getActiveFont(), doc);
}

document.addEventListener('astro:before-swap', (event: Event) => {
  const newDoc = (event as Event & { newDocument: Document }).newDocument;
  applyAppearance(newDoc);
});

document.addEventListener('astro:page-load', () => applyAppearance());
