// Pure option helpers for SelectionSwitch. Kept apart from selection-controls.ts
// because that module pulls in lifecycle.ts, which touches `document` on load
// and so can't be imported from Astro frontmatter.
export interface SelectionOption {
  value: string;
  label: string;
}

/** Colors for a swatch-variant option. `theme` scopes that theme's tokens to
 * the option; `fill`/`ink` set arbitrary colors and win over the theme. */
export interface SwatchColors {
  theme?: string;
  fill?: string;
  ink?: string;
}

export interface SwitchOption extends SelectionOption {
  swatch?: SwatchColors;
}

export type SwitchVariant = 'swatch';

export function switchClasses(variant?: SwitchVariant, extra?: string): string {
  return ['selection-switch', variant && `selection-switch--${variant}`, extra].filter(Boolean).join(' ');
}

/** Attributes that paint an option as a swatch. Shared by SelectionSwitch.astro
 * and createSelectionSwitch so both encode colors the same way. */
export function swatchAttributes(swatch?: SwatchColors): Record<string, string> {
  if (!swatch) return {};
  const attrs: Record<string, string> = {};
  if (swatch.theme) attrs['data-theme-preview'] = swatch.theme;
  const style = [
    swatch.fill && `--swatch-fill: ${swatch.fill}`,
    swatch.ink && `--swatch-ink: ${swatch.ink}`,
  ].filter(Boolean).join('; ');
  if (style) attrs.style = style;
  return attrs;
}
