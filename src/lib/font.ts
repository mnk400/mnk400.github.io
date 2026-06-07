// Font state utility. Pure module — no DOM event registration here, that
// lives in src/components/FontSwitcher.astro.

export interface Font {
  name: string;
  label: string;
  stack: string;
  /** Probe string for document.fonts.load(); omit for system-only stacks. */
  probe?: string;
  /** Optional scale override (1 = unchanged). */
  scale?: number;
}

export const fonts: Font[] = [
  {
    name: 'default',
    label: 'Default Font',
    stack: '-apple-system, "SF Pro Display", "Inter", sans-serif',
  },
  {
    name: 'source-serif',
    label: 'Source Serif',
    stack: '"Source Serif 4", serif',
    probe: '1em "Source Serif 4"',
  },
  {
    name: 'inconsolata',
    label: 'Inconsolata',
    stack: '"Inconsolata", monospace',
    probe: '1em "Inconsolata"',
  },
];

export const defaultFont = 'default';
export const fontNames = fonts.map(f => f.name);

const STORAGE_KEY = 'font';

function isValid(name: string | null): name is string {
  return !!name && fontNames.includes(name);
}

export function getActiveFont(): string {
  if (typeof window === 'undefined') return defaultFont;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isValid(stored)) return stored;
  return defaultFont;
}

/** Applies the font CSS variables to a given document. */
export function applyFont(name: string, doc: Document = document): void {
  const font = fonts.find(f => f.name === name) ?? fonts.find(f => f.name === defaultFont)!;
  const root = doc.documentElement;
  root.style.setProperty('--font-family', font.stack);
  root.style.setProperty('--font-size-scale', String(font.scale ?? 1));
}

/** Persists, then applies — waiting for the webfont if needed to avoid FOUT. */
export function setFont(name: string): void {
  if (!isValid(name)) return;
  window.localStorage.setItem(STORAGE_KEY, name);
  const font = fonts.find(f => f.name === name)!;

  if (font.probe && document.fonts?.load) {
    document.fonts.load(font.probe).then(
      () => applyFont(name),
      () => applyFont(name), // fall back on probe failure
    );
  } else {
    applyFont(name);
  }
}
