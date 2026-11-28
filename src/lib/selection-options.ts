// Pure option helpers for SelectionSwitch. Kept apart from selection-controls.ts
// because that module pulls in lifecycle.ts, which touches `document` on load
// and so can't be imported from Astro frontmatter.
export interface SelectionOption {
  value: string;
  label: string;
  /** Accessible name, when the visible label doesn't read as one. */
  ariaLabel?: string;
}

export function switchClasses(extra?: string): string {
  return ['selection-switch', extra].filter(Boolean).join(' ');
}
