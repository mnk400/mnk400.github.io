# Style DNA

What makes this site look and feel like *this site*. Read before making any visual change; a change that violates this doc is losing the vibe, not polishing it.

## The vibe in one line

A small, quiet, airy personal site: thin type on soft themed canvases, translucent frosted surfaces, everything compact and slightly understated.

## Non-negotiables

- **Thin body type.** `body` and `p` are weight **200** (`_typography.scss`). Bold is 400, headings 500. Never bump body weight for "legibility."
- **Small scale.** Body 11.5–12pt, headings top out at 16pt. Content column is **525px** (`$max-content-width`).
- **Themed, not light/dark.** 9 palettes (`linen` default, denim, charcoal, plum, moss, butter, espresso, blush, sky) via `[data-theme]` on `:root` (`_variables.scss`). Nothing may assume a light or dark background — use tokens (`--text-color`, `--sec-text-color`, `--translucent-*`, `--contrast-overlay`), never hardcoded colors, so all 9 themes work.
- **Translucency for depth.** Surfaces are `--translucent-low/medium/high` + `backdrop-filter: blur(10px)` + a 1px `outline` hairline (`translucent-surface` / `soft-outline` mixins in `_mixins.scss`) — not opaque cards, not box-shadow-heavy elevation.
- **User-switchable fonts.** `--font-family` and `--font-size-scale` are set pre-paint from localStorage (`Default.astro`). Never hardcode a font-family in page styles; use the token or the mixins.

## Interaction grammar

- **Hover** = subtle: links get a translucent underline (2px offset) + italic; buttons/cards shift background to `--contrast-overlay-hover` or `--translucent-medium`. Always guarded with `@media (any-hover: hover)`, with the `.touch-hover` JS class as the touch fallback (`hover-interactive` mixin).
- **Press** = `scale: 0.96` on `:active`, `--transition-fast`. Never pair press-scale with a same-click text swap / icon rotate / panel expand.
- **Entrances** = fade + `translateY(var(--motion-slide-offset))` (8px), staggered 60ms (`_reveal.scss`). Same language as the directional view transitions (`_view-transitions.scss`): forward slides up, back slides down, header crossfades, background never animates.
- **Collapse/expand** = `expanding-collapsible` mixin (max-height + opacity + margins over `--transition-slow`).
- **Easing** = `cubic-bezier(0.4, 0, 0.2, 1)` everywhere, durations only via `--transition-fast/medium/slow/backdrop/slowest`.
- **Reduced motion** is honored: transforms removed, durations collapsed (see `_reveal.scss` pattern).

## Token discipline

Spacing `--spacing-2xs…3xl`, radii `--radius-sm…pill/round`, control heights `--control-height-sm/md`, z-index `--z-*`, motion `--motion-slide-offset`. New CSS should compose these; a raw px value for something a token covers is a bug. Game colors are the one deliberately theme-independent set (`--game-*`).

Full-width controls sit at `--control-height-md`; compact inline controls at `--control-height-sm`. A control that expands to full width grows to md height on purpose (e.g. the small search pill when opened) — that height change outranks the zero-shift preference.

## Charms

Small decorative corner pieces, that give an otherwise minimal page a little personality. They are the exception to "decoration is scarce," kept in line by discipline rather than banned.

- **The `<Charm>` contract.** A charm absolutely pins to a corner of a `position: relative` host, then applies an outward `x`/`y` nudge + resting `rotate` all passed as props that become inline CSS custom properties. Content is an open slot (emoji, `<img>`, inline SVG, a text badge); the host owns placement, the slot owns look. `aria-hidden` + `pointer-events: none` by default; a charm opts back into pointer events when it wants its own hover
- **Restraint is the rule.** Few per page, static at rest (no perpetual motion), living in margins/corners, never inside the reading column. Any motion is hover-only and rides the standard easing + `--transition-*`.

## Tone

- Copy is lowercase-casual, brief, first-person.
- Numbers that change use `font-variant-numeric: tabular-nums`.
- Decoration is scarce: no gradients, no borders where a hairline outline works, no perpetual motion.
