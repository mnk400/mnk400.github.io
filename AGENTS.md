# AGENTS.md

Guidance for AI agents working in this repository.

## Build Commands

```bash
npm install       # Install dependencies
npm run dev       # Dev server at localhost:4321
npm run build     # Build static site to dist/
npm run check     # astro check — typechecks .astro and .ts (run this; build does NOT typecheck)
npm run preview   # Serve the built site
```

`npm run check` must stay at 0 errors. `astro build` does not typecheck, so a type error will
build cleanly and ship — always run `check` before considering a change done.

Cloudflare Pages Functions in `functions/` and `lib/` are excluded from the root `tsconfig.json`
and have their own config: `npx tsc -p functions/tsconfig.json`.

## Architecture

Astro 7 static site (portfolio/blog/tools). No UI framework — vanilla TypeScript in `<script>`
blocks and `src/lib/` modules, SCSS for styling. View Transitions via `<ClientRouter />`, so the
site behaves like an SPA and **every page script must be lifecycle-aware** (see below).

### Key Directories

- `src/pages/` — file-based routes. `[year]/[month]/[day]/[slug].astro` renders blog posts.
- `src/layouts/` — `Default.astro` wraps everything (head, theme bootstrap, header/footer);
  `Post.astro` wraps content/tool pages and adds the title/date header.
- `src/components/` — reusable `.astro` components.
- `src/lib/` — shared TypeScript. Feature folders (`image-zoom/`, `image-gallery/`,
  `camera-modes/`, `posts/`) hold logic too big for a page's inline script.
- `src/data/` — typed site data. `more/` holds one file per category (see below).
- `src/styles/` — SCSS. `main.scss` is the site bundle; `export.scss` is the public design-system
  export. Partials are `base/` → `layout/` → `components/` → `charms/` → `pages/` → `utilities/`.
- `src/integrations/` — build-time Astro integrations (`og-images.ts`, `redirects.ts`).
- `src/content/posts/` — Markdown blog posts, `YYYY-MM-DD-slug.md`.
- `public/assets/` — static files served at `/assets/*`. Not processed by Astro.
- `functions/` + `lib/` — Cloudflare Pages Functions (see below).
- `docs/` — `style-dna.md` (visual system) and `gallery-manifest.md` (gallery JSON format).

### The `/more/` Data Layer

`src/data/more/*.ts` is the source of truth for every tool, game, and archive page. One file per
family, each exporting a `MoreItemData[]`. They're aggregated in `src/data/more-items.ts` and
normalized into groups by `src/lib/more.ts`.

An item's `id` is its URL path: `id: 'games/colordle'` → `/games/colordle/`. The `id`'s parent
segments determine its group, so `archive/paintings/monet` groups under `archive/paintings`.

Category labels, chips, and sort order live in `src/data/categories.ts`, keyed by both top-level
(`games`) and full path (`archive/paintings`). **A missing category entry does not error** — the
group silently falls back to the raw slug as its label. Add the entry when adding a family.

`redirectFrom` entries become 301s in `_redirects` via `src/integrations/redirects.ts`. Keep old
URLs listed there; the site has taken SEO damage from broken redirects before.

Adding a page means both a route in `src/pages/` and an entry in the matching `src/data/more/`
file. Families that need extra fields extend the base type
(`PaintingGalleryItemData extends MoreItemData` in `paintings.ts` is the pattern to copy).

### Client Script Lifecycle

`<ClientRouter />` swaps the DOM on navigation without a full reload. Scripts run once per
session, so initialization hangs off `astro:page-load` and teardown off `astro:before-swap`.

**Anything attached to `document`, `window`, or an observer must be torn down**, or it leaks
across every navigation and retains detached DOM. Element-scoped listeners die with the element
and are fine. A `dataset.initialized` guard is *not* sufficient — after a swap the element is a
new node, so init runs again on a fresh element.

The established pattern is an `AbortController` whose signal is passed to every listener, aborted
on `astro:before-swap` — see `src/lib/image-zoom/index.ts` and `src/lib/image-gallery/index.ts`.

### Theme & Font System

Nine themes defined in `src/styles/partials/base/_variables.scss`, toggled via `data-theme` on
`<html>`. State logic lives in `src/lib/theme.ts` and `src/lib/font.ts`; the switcher components
(`ThemeSwitcher.astro`, `FontSwitcher.astro`) own the event wiring.

`Default.astro` also contains an inline pre-paint script that applies theme and font before first
paint to avoid a flash. It deliberately duplicates the resolution logic in ES5 but sources its
*data* from the same modules via `define:vars`. **Changing theme/font resolution order means
changing both places.**

### Content Collections

`src/content.config.ts` defines two:

- `posts` — glob loader over `src/content/posts/*.md`.
- `readmes` — custom loader that fetches product READMEs from GitHub at build time. A failed
  fetch **fails the build** unless `ALLOW_README_FALLBACK=true`, which exists only for
  intentionally building placeholder product pages.

### Cloudflare Pages Functions

`functions/{archive,art,photos}/_middleware.ts` are 2-line re-exports of the shared handler in
`lib/og-gallery.ts`, which injects per-image OG tags for gallery deep links. They're scoped by
directory so high-traffic static pages stay pure static. To cover a new gallery route, add
another directory with the same 2-line re-export.

### Patterns

- **SCSS**: compose CSS custom properties from `_variables.scss` and mixins from `_mixins.scss`.
  A raw px value for something a token covers is a bug. Read `docs/style-dna.md` before any
  visual change.
- **DOM access**: prefer `[data-*]` attribute selectors over `getElementById`. The codebase still
  has ~134 `getElementById` calls against string IDs that are also used as SCSS selectors —
  renaming one silently breaks JS and CSS with no build feedback. Don't add more.
- **Page scripts**: markup and config stay in the `.astro` file; anything substantial or reusable
  moves to `src/lib/<feature>/`.
- **Images**: `public/` is served unprocessed, so images there get no optimization. Prefer
  pre-generated derivatives (the paintings pipeline emits 1000px previews) over raw originals.
- **New tool/game**: route in `src/pages/<category>/<slug>.astro` using `layout: Post`, entry in
  `src/data/more/<category>.ts`, styles in `src/styles/partials/pages/`, category metadata in
  `src/data/categories.ts` if the category is new.

## Design System Export

This codebase exports a reusable CSS-only design system consumed by other projects:

- **`src/styles/export.scss`** — compiled and served at `/style/export.css` by
  `src/pages/style/export.css.ts`. Deliberately narrower than `main.scss`: no header, footer,
  view transitions, page-specific styles, or JS assumptions.
- **`public/assets/export-guide.txt`** — plain-text reference for agents on other codebases,
  served at `/assets/export-guide.txt`.

**When to update `export-guide.txt`:** any time you change something the export ships — design
tokens in `_variables.scss`, mixins, the component partials listed in `export.scss`
(`_buttons`, `_cards`, `_forms`, `_grids`, `_image-zoom`, `_icon`, `_info-grid`), utility classes
in `_helpers.scss`, or `layout/_wrapper.scss`. Adding, removing, or renaming a CSS class or
variable, or changing behavior, means updating the guide. Don't update it for changes to
`partials/pages/`, `partials/charms/`, header/footer, or site-specific scripts.

## Deployment

Push to `main` auto-deploys to Cloudflare Pages (project: `mnk400-github-io`).
Canonical domain: `manik.cc`.

Note: `master` is stale legacy history and is not deployed.
