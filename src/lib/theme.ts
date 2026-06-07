// Theme state utility. Pure module — no DOM event registration here, that
// lives in src/components/ThemeSwitcher.astro.

export interface Theme {
  name: string;
  label: string;
  meta: string; // theme-color meta tag value
}

export const themes: Theme[] = [
  { name: 'linen',    label: 'Linen',    meta: '#f2f0ef' },
  { name: 'charcoal', label: 'Charcoal', meta: '#1a1a1a' },
  { name: 'denim',    label: 'Denim',    meta: '#2D3D5A' },
  { name: 'plum',     label: 'Plum',     meta: '#2a1a1d' },
  { name: 'moss',     label: 'Moss',     meta: '#2a2f2a' },
  { name: 'butter',   label: 'Butter',   meta: '#F1D799' },
  { name: 'blush',    label: 'Blush',    meta: '#f1d9d3' },
  { name: 'sky',      label: 'Sky',      meta: '#d9eaf8' },
  { name: 'espresso', label: 'Espresso', meta: '#1f1410' },
];

export const defaultTheme = 'linen';
export const themeNames = themes.map(t => t.name);

const STORAGE_KEY = 'theme';

function isValid(name: string | null): name is string {
  return !!name && themeNames.includes(name);
}

/** Reads the active theme from (URL ?theme=) → localStorage → default. */
export function getActiveTheme(): string {
  if (typeof window === 'undefined') return defaultTheme;
  const urlTheme = new URL(window.location.href).searchParams.get('theme');
  if (isValid(urlTheme)) return urlTheme;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isValid(stored)) return stored;
  return defaultTheme;
}

/** Applies the theme to a given document (defaults to live document). */
export function applyTheme(name: string, doc: Document = document): void {
  const theme = themes.find(t => t.name === name) ?? themes.find(t => t.name === defaultTheme)!;
  doc.documentElement.setAttribute('data-theme', theme.name);

  let metaTag = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!metaTag) {
    metaTag = doc.createElement('meta');
    metaTag.name = 'theme-color';
    doc.head.appendChild(metaTag);
  }
  metaTag.content = theme.meta;
}

/** Persists and applies, with a 500ms transition class on html+body so the
 * change animates instead of snapping. Used by user interaction (switch
 * click) — the pre-paint init in Default.astro deliberately bypasses this so
 * initial paint stays instant. */
export function setTheme(name: string): void {
  if (!isValid(name)) return;
  window.localStorage.setItem(STORAGE_KEY, name);
  const html = document.documentElement;
  const body = document.body;
  html.classList.add('theme-transition');
  body?.classList.add('theme-transition');
  window.setTimeout(() => {
    html.classList.remove('theme-transition');
    body?.classList.remove('theme-transition');
  }, 500);
  applyTheme(name);
}
