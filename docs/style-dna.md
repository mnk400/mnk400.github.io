# Style DNA

What makes this site look and feel like *this site*. Read before making any visual change; a change that violates this doc is losing the vibe, not polishing it.

## The vibe in one line

A small, quiet, airy personal site: thin type on soft themed canvases, translucent frosted surfaces, everything compact and slightly understated.

## Non-negotiables

- **Thin body type.** `body` and `p` are weight **200** (`_typography.scss`). Bold is 400. Never bump body weight for "legibility."
- **Hierarchy by size, not weight.** Page titles are 300 with tracking tightened (-0.022em), so they share the body's thinness; body headings h1–h3 are all 400 and step down by size only. Tracking tightens as size grows.
- **Small scale, one set of tokens.** `--type-meta` 13 · `--type-body` 15 · `--type-lede` 16 · `--type-h3` 16 · `--type-h2` 19 · `--type-h1` 22 · `--type-title` 30 (px, as rems). Running text leads at 1.5, prose at 1.65. Meta (dates, footer, archive dates) uses the `meta-text` mixin: 13px/300 with tabular figures. Content column is **525px** (`$max-content-width`).
- **Themed, not light/dark.** 9 palettes (`linen` default, denim, charcoal, plum, moss, butter, espresso, petal, sky) via `[data-theme]` on `:root` (`_variables.scss`). Nothing may assume a light or dark background — use tokens (`--text-color`, `--sec-text-color`, `--translucent-*`, `--contrast-overlay`), never hardcoded colors, so all 9 themes work.
- **Translucency for depth.** Surfaces are `--translucent-low/medium/high` + `backdrop-filter: blur(10px)` + a 1px `outline` hairline (`translucent-surface` / `soft-outline` mixins in `_mixins.scss`) — not opaque cards, not box-shadow-heavy elevation.
- **One family.** `--font-family` (`_variables.scss`): SF via `-apple-system, BlinkMacSystemFont, system-ui` on Apple, Inter elsewhere (tuned to match in `inter.scss`). Never hardcode a font-family in page styles; use the token or the mixins. Note the reset gives `h1`/`p`/`span` `font-family: inherit`, which outranks the `*` rule, so a family change on a container must set `font-family` itself, not just the variable.

## Interaction grammar

- **Hover** = the highlighter (`src/lib/interaction`): one box per scope that glides between clickables and leans toward the cursor. Keyboard focus gets the same box in place of the focus ring. No italics, no underlines.
    - **Text and rows**: the box sits behind the glyphs in `--accent-fill` and the text turns `--accent`. A wrapped link gets a box per line, an icon-only button a circle.
    - **Surfaces** (anything with a fill or outline): the box is 3px bigger, concentric with the corners, and takes over the surface's fill and hairline as it covers them, leaving one flat accent shape. An image card is one target, caption included, and the box brings its padding: a `--spacing-sm` mat on the archive hubs, a `--spacing-xs` frame in galleries.
    - **Everything inside a hovered target turns accent**, secondary text included. Hierarchy holds through size and weight.
    - **The accent goes where the colour is.** Tinted things get the wash. A solid fill that means emphasis (the filled `.btn`, a slider's value) becomes solid `--accent`. A fill that *is* the content (theme swatches, buttons over imagery) keeps its colours. Album art takes a tint: the box paints over it and carries its stats in the page colour.
    - **Selected** = the dark `--contrast-overlay` fill with page-coloured text, on chips and dropdown rows alike. Hovered, it hands over to a solid accent box. Selection is ARIA state, never a class.
    - **Rows make room**: bare rows have no hairlines, and their neighbours drift `--motion-make-room` apart around the box. The box never touches another filled thing.
    - **Accents** are per theme, a deep or bright take on the theme's own hue, mixed ~12% (light) or ~18–20% (dark) into `--accent-fill`. Each clears 4.5:1 on its fill, for weight-200 text; re-check all nine when changing one.
    - Old fill hovers survive only as `hover-fallback`: touch taps and the CSS export.
- **Links at rest** = weight 300 over the 200 copy, no underline, so a link is findable without decoration. Inside bold text or a heading a link keeps its parent's weight.
- **Press** = `scale: 0.96` on `:active`, `--transition-fast`, on surfaces only. Never pair press-scale with a same-click text swap / icon rotate / panel expand.
- **Entrances** = fade + `translateY(var(--motion-slide-offset))` (8px), staggered 60ms (`_reveal.scss`). Same language as the directional view transitions (`_view-transitions.scss`): forward slides up, back slides down, header crossfades, background never animates.
- **Collapse/expand** = `expanding-collapsible` mixin (max-height + opacity + margins over `--transition-slow`).
- **Easing** = `cubic-bezier(0.4, 0, 0.2, 1)` everywhere, durations only via `--transition-fast/medium/slow/backdrop/slowest`. The one exception is the highlighter's glide, an exponential follow that settles in about `--transition-medium`.
- **Reduced motion** is honored: transforms removed, durations collapsed (see `_reveal.scss` pattern).
- **Filters highlight, they don't hide** (on index pages written as prose, e.g. `/more`). Nothing is ever removed: a chip dims everything outside its category, search dims every name that doesn't match (across all categories, so a match stays lit even inside a dimmed sentence), both via a `color-mix` of `--sec-text-color`. A chip is a deliberate choice, so it fades harder (~22%) than live search does (~45%). The one layout change allowed is opening an "and N more" fold that holds what was asked for.

## Surfaces

Two kinds, and a surface belongs to exactly one:

- **Tinted surfaces stay.** Cards, controls, the music widget row, dropdown panels: `translucent-surface` (a `--translucent-*` fill + blur + hairline). They sit *in* the page, often full width, and hold still.
- **Slips come and go.** Anything that appears on hover/focus and leaves on its own (first use: the `/more` status note, `.more-note`). A slip is page-coloured, not tinted (the `slip` mixin: `--background-main` at 85% + blur + `--translucent-medium` hairline), so it reads as paper lifted *over* the page rather than another slab. Rules:
    - Hugs its content (`width: fit-content`, capped below full width), never spans the column.
    - Stacked type one step down: a title line at 400, detail below at 200 in `--sec-text-color`. No inline separators.
    - Quick in, soft out: enters on `--transition-fast`, exits on `--transition-medium` after a short hold (~250ms), so moving between triggers swaps content in place instead of blinking.
    - Never interactive (`pointer-events: none`). If it needs a click, it's a tinted surface.

## Token discipline

Spacing `--spacing-2xs…3xl`, radii `--radius-sm…pill/round`, control heights `--control-height-sm/md`, z-index `--z-*`, motion `--motion-slide-offset`. New CSS should compose these; a raw px value for something a token covers is a bug. Game colors are the one deliberately theme-independent set (`--game-*`).

Full-width controls sit at `--control-height-md`; compact inline controls at `--control-height-sm`. A control that expands to full width grows to md height on purpose (e.g. the small search pill when opened) — that height change outranks the zero-shift preference.

## File organization

- **One component, one partial.** A component's `.astro` file, its root block class, and its SCSS partial share a name: `RangeSlider.astro` → `.range-slider` → `components/_range-slider.scss`. Everything the component owns lives there (`.range-slider__value` ships with the slider) so deleting the component deletes all of its CSS. Styling for bare elements no component owns — `input[type="text"]`, `<select>`, `input[type="color"]` — is base element CSS, not a component, and stays grouped.
- **No Astro `<style>` blocks.** `export.scss` is a public CSS export and can only `@use` partials; scoped component styles would silently drop out of it and break the copy-the-markup contract in `export-guide.txt`. Global cascade + disciplined naming is the trade we've made — fix file boundaries, not the mechanism.
- **`export.scss` keeps an explicit `@use` list.** No barrel file. Adding a component costs two `@use` lines, and in exchange there is exactly one place that declares what ships publicly.
- **Splitting a partial preserves `@use` order.** New lines go where the old block sat in `main.scss`, or the cascade shifts between equal-specificity rules.

## Charms

Small decorative corner pieces, that give an otherwise minimal page a little personality. They are the exception to "decoration is scarce," kept in line by discipline rather than banned.

- **The `<Charm>` contract.** A charm absolutely pins to a corner of a `position: relative` host, then applies an outward `x`/`y` nudge + resting `rotate` all passed as props that become inline CSS custom properties. Content is an open slot (emoji, `<img>`, inline SVG, a text badge); the host owns placement, the slot owns look. `aria-hidden` + `pointer-events: none` by default; a charm opts back into pointer events when it wants its own hover
- **Stickers, not ornaments.** A charm reads like a sticker pressed onto the page: it pins to a corner of a real host (page header, section card, gallery) and may hang past that host's edge, into the gutter or over the corner of an image. Header charms sit in the title gutter that `page__header--charmed` reserves.
- **Never over words.** A charm may overlap imagery or surface chrome, never copy, a title, or a control's label. Overlap is only safe because charms don't take pointer events; one that opts back in must not sit over anything clickable.
- **Restraint is the rule.** One decorative charm per page, plus the site-wide ones (header flower, count badges). Static at rest (no perpetual motion); any motion is hover-only and rides the standard easing + `--transition-*`.

## Tone

- Copy is lowercase-casual, brief, first-person.
- Numbers that change use `font-variant-numeric: tabular-nums`.
- Decoration is scarce: no gradients, no borders where a hairline outline works, no perpetual motion.
