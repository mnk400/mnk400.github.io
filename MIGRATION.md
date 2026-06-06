# Astro Migration Plan

Long-running working doc for migrating manik.cc from Jekyll to Astro. Edit freely — this is meant to evolve, not stay pristine.

Branch: `astro`. Deploys to `astro.manik.cc` via Cloudflare Pages. Master continues to ship Jekyll to `manik.cc` (GH Pages) and `fuckmanik.com` (Cloudflare Pages) until cutover.

---

## Why

Two frustrations, both real:

1. **Liquid templating doesn't scale to derived/grouped data.** The `more/index` category grouping (~50 lines of `assign | push | sort`) and the breadcrumb logic in `_includes/header.html` are the worst offenders. Adding a new axis (extra nesting, new sort key) is painful.
2. **Component model is paper-thin.** `_includes/*.html` are string interpolation with no types, no slots, no scoping. The `image-gallery.html` include passes 18 data-attrs as a string-typed bridge to JS — that's the limit of what Liquid can model.

Secondary motivator: persistent DOM across navigation (background video, music widget audio state). Astro's `transition:persist` solves this.

## Non-goals

- Not rewriting games or tools to use a framework. They stay vanilla JS.
- Not adopting React/Svelte by default. Astro components + vanilla `<script>` is the baseline.
- Not redesigning anything. UI parity first; redesigns are a separate project.
- Not modernizing `_sass/` from `@import` to `@use` during the migration. Separate cleanup.

---

## The three-bucket rule

Every file the migration touches falls into one of three buckets. Knowing which determines when to rewrite and when to delete.

### Bucket 1 — Page-local
Lives on exactly one page. Port and delete the Jekyll original in the same commit.

Examples:
- `index.html` → `src/pages/index.astro`
- `_more/games/colordle.html` + `assets/js/games/colordle.js` → `src/pages/games/colordle.astro` + co-located script

### Bucket 2 — Shared chrome
Multiple consumers will exist, but as of the current port this is the only one. Port now, but keep the Jekyll original until the **last** consumer migrates.

Examples:
- `src/components/Header.astro` (home variant exists; breadcrumb variant lands when first sub-page ports)
- `src/components/Footer.astro`
- `src/components/StructuredData.astro`

### Bucket 3 — Shared infrastructure
Used by many pages, shape is uncertain until we've ported several consumers. Defer to a dedicated phase. Astro consumes the existing file unchanged in the meantime.

Examples:
- `assets/js/core/ui-components.js` (~700 lines, 8 component types)
- `assets/js/core/theme-manager.js`, `font-manager.js`
- `assets/js/components/image-zoom.js`
- `_sass/` (entire tree — consumed via Vite `loadPaths`)
- `assets/js/components/readme-renderer.js`, `release-meta.js`

**Hard rule:** never rewrite a Bucket 3 file as part of a page slice. It always becomes its own phase once we have enough consumers to design against.

---

## Lifecycle rule (mandatory for every interactive port)

`<ClientRouter />` is enabled from Phase 1 onward (see phases below). That means navigations are **same-document** — `DOMContentLoaded` fires once, not on every page change. Any new code that depends on first-paint-time init **must** register against Astro's lifecycle events, not `DOMContentLoaded`.

```js
// ❌ won't re-run after client navigation
document.addEventListener('DOMContentLoaded', init);

// ✅ runs on initial load AND every client-side page change
document.addEventListener('astro:page-load', init);
```

For inline `<script>` tags inside `.astro` components: add `is:inline` and listen to `astro:page-load`. For external modules loaded via `<script src="...">`: same rule, the file's top-level event listener uses `astro:page-load`.

**Bucket 3 escape hatch:** `assets/js/core/ui-components.js` (and similar legacy files) still register on `DOMContentLoaded`. We don't rewrite them yet — instead `Default.astro` includes a small shim that calls the same global init functions on `astro:page-load`. Init functions are idempotent via `data-*-initialized` guards, so double-firing is safe. When Phase 6 rewrites these files, the shim is deleted.

**Validation:** during a port, click around between two ported pages without a full reload. Theme switcher, expandable section, music widget, photo reveal — all must work on the destination page.

---

## Definition of "done" for a page

A page slice is done when:

1. URL serves correctly via `npm run dev` and `npm run build`
2. Visual parity with the Jekyll version (themes, fonts, hover states, animations)
3. All page-local Jekyll files (Bucket 1) deleted
4. Any Bucket 2 files this is the last consumer of have been deleted; otherwise they stay
5. Front matter has been mapped into the Astro page's frontmatter (typed) — no leftover `layout: post` references the Astro side reads
6. If the page does interactive things, hover/click/touch tested in a real browser, not just `curl` parity
7. SEO surfaces still emit: OG, structured data, canonical URL, social preview image — all derived from `Astro.site`, not a hardcoded host
8. Any interactive script uses `astro:page-load` (not `DOMContentLoaded`) — and the page works correctly when arrived at via client-side nav, not only direct load

Not required:
- Performance work (defer to a final pass)
- `transition:persist` decisions (defer to Phase: View Transitions)

---

## File layout convention

```
src/
  layouts/        # Default.astro, Post.astro, Product.astro, Tool.astro, etc.
  components/     # Reusable .astro components (Header, Footer, Icon, MusicWidget, etc.)
  pages/          # File-based routing → URLs
    index.astro
    about/
    blog/
    more/
    games/
    archive/
    ...
  content/        # Content collections (posts, more metadata)
  data/           # site.ts, categories.ts, anything typed and imported
  styles/         # main.scss (just re-imports from _sass/), plus any new component-scoped SCSS

public/
  assets/         # SYMLINK → ../assets (legacy assets dir)

_sass/            # Reference, consumed via Vite loadPaths. Stays until SCSS phase.
_includes/        # Reference. Files deleted per Bucket 2 rule.
_layouts/         # Reference.
_more/            # Reference.
_posts/           # Reference until blog phase.
_data/            # Reference (categories.yml read directly).
assets/js/        # Stays serving from /assets/js/ until each JS file moves to Bucket 1 cleanup or Bucket 3 phase.
```

`_includes/icons/` is consumed in place via `import.meta.glob('/_includes/icons/**/*.svg', { query: '?raw' })`. No copy needed.

---

## Phase plan

Phases are **roughly ordered** but can interleave. Phase 0 is done. Phase 1 is partially done from the spike.

### Phase 0 — Bootstrap ✅ done
- Branch created, Jekyll tooling files deleted (`Gemfile`, `_config.yml`)
- Astro + sass installed
- `astro.config.mjs`, `tsconfig.json`, `.gitignore` updated
- `public/assets` symlink to legacy `assets/` dir
- `src/data/site.ts`, `src/styles/main.scss`
- Base layout, Header (home variant), Footer, Icon, MusicWidget, ExpandableSection, SelectionSwitch, StructuredData components
- `/` renders end-to-end

### Phase 0.5 — `astro-icon` swap (do before Phase 1)
Every page port from Phase 1 onward references the Icon component. Swap to `astro-icon` now so we never have to re-migrate icon names later.

- Install `astro-icon` + the Iconify icon-set package we want to use
- Add the integration in `astro.config.mjs`
- Rewrite `src/components/Icon.astro` as a thin wrapper around `astro-icon`'s `<Icon>` that preserves the existing callsite API (`<Icon name="arrow-down-left" weight="bold" />`) and applies our defaults (`class="icon"`, `aria-hidden`)
- Delete `_includes/icons/` and `_includes/icon.html` once nothing in `src/` references them via `import.meta.glob`

The wrapper is the only file in the codebase that knows which Iconify set we use. Adding a new icon = use its name; no SVG copying. Swapping icon sets later = change one file.

**Done criteria:** all current Icon usages render unchanged; `_includes/icons/` and `_includes/icon.html` deleted; new icons added by name, no SVG files copied.

### Phase 1 — Static pages + `<ClientRouter />` (low risk, finish quickly)
This phase deliberately bundles the second-page port with client-router setup. We need a second URL to validate transitions against; doing both together avoids a separate retrofit later, and means every interactive port from Phase 4 onward is already tested against same-document navigation.

Pages:
- `/about` → port `about/index.md`, define `Post.astro` layout, port breadcrumb variant of Header
- `/love` → tiny static page
- `/404` → port `404.html`

Client router setup (was Phase 7, moved here):
- Add `<ClientRouter />` to `Default.astro`
- Port `view-transitions.js`: direction detection (forward/back) and the breadcrumb-name swap logic move from `pageswap`/`pagereveal` (cross-document) to `astro:before-swap` / `astro:after-swap` hooks
- Add the lifecycle-shim script in `Default.astro` that re-runs `ui-components.js`'s global init functions on `astro:page-load` (see Lifecycle rule above)
- Verify SCSS view-transition rules in `_sass/base/_view-transitions.scss` still apply — they should, but Safari needs a click-through test

Deferred to Phase 7 (still): `transition:persist` decisions for the music widget and any background video — those need real consumer components in place first.

**Done criteria:** four URLs working, `Post.astro` layout established, Header.astro covers both variants, client-side navigation between any two pages doesn't lose theme switcher / expandable / music-widget behavior, browser back-button still triggers the reverse-direction transition.

### Phase 2 — Content collections + blog
- Move `_posts/*.md` → `src/content/posts/*.md`
- Define `posts` collection in `src/content/config.ts` with a Zod schema
- Strip `layout: post` from front matter as part of the move (Astro doesn't need it; the page route handles layout)
- Build `src/pages/blog/[slug].astro` for individual posts with proper URL shape (`/YYYY/MM/DD/slug`)
- Pagination via Astro's `paginate()` (replaces `jekyll-paginate`)
- Wire `redirect_from` → `redirects` in `astro.config.mjs`
- Replace the spike's hand-rolled `?raw` frontmatter parser in `src/pages/index.astro` with a real `getCollection('posts')` call
- Delete `_posts/`, `_layouts/post.html` after the last post is verified

**Done criteria:** all 6 posts render, archive index on `/` reads from collection, pagination works.

### Phase 3 — `/more/` and category routing (the high-value port)
This is the one that justifies the migration. If this phase doesn't feel meaningfully better than Liquid, stop and reconsider scope.

- Move `_data/categories.yml` → `src/data/categories.ts` (typed)
- Define `more` content collection with schema matching `_more/**/*.html` front matter
- Port `more/index.html` → `src/pages/more/index.astro`. Replace `assign | push | sort` with `Map.groupBy`.
- Port `_more/archive/paintings/index.html` → `src/pages/archive/paintings/index.astro` using `getCollection('more')` filter
- Update Header.astro's breadcrumb logic to use the typed categories module
- Update StructuredData.astro's BreadcrumbList logic the same way
- Delete `_includes/header.html`, `more/index.html`, the archive hub markup

**Done criteria:** `/more/`, `/archive/paintings/`, breadcrumbs all work; `_includes/header.html` deleted.

### Phase 4 — Tools and games (volume work)
- Each `_more/<cat>/<slug>.html` → `src/pages/<cat>/<slug>.astro`
- Script references move from front matter `scripts: [...]` to `<script src="...">` at bottom of `.astro`
- Bucket 1: each game's JS file moves from `assets/js/games/` to a per-page co-located script or stays in `public/` if cleaner
- **No structural rewrites**, but the lifecycle rule applies: if the original JS used `DOMContentLoaded`, change that single line to `astro:page-load` during the port. Game/tool internals stay untouched.

**Done criteria:** every URL under `/games/`, `/cli-tools/`, `/fun-tools/`, `/image-tools/`, `/apps/`, `/music/`, `/archive/things/` works, including arriving via client-side navigation from another ported page.

### Phase 5 — Image gallery + archive pages
- Port `_includes/image-gallery.html` → `src/components/ImageGallery.astro` with **typed props** (no more 18 data-attrs)
- Refactor boundary in `assets/js/media/image-gallery.js`: instead of reading data-attrs, take a config object passed by the component init script. JS internals stay the same.
- Port all painting pages (`_more/archive/paintings/*.html`). Consider a single `[artist].astro` dynamic route since they all share shape.
- Port `/photos/` page
- Delete `_includes/image-gallery.html`

**Done criteria:** all archive pages and `/photos/` work; ImageGallery component has typed props; gallery JS doesn't read DOM-level data-attrs anymore.

### Phase 6 — Shared infrastructure (Bucket 3 promotion)
With most pages now Astro-native, the shape of shared components is finally clear. Do the rewrites.

- Port `ui-components.js` → small, co-located scripts inside each component (`SelectionSwitch.astro`, `SelectionDropdown.astro`, `SearchPill.astro`, `RangeSlider.astro`, `ImageUpload.astro`, `ExpandableSection.astro`). Kill global `window.switchManager` etc; use module-scoped state. Touch-hover handler becomes a single global script.
- Port `theme-manager.js` + `theme-config.js` → `src/scripts/theme.ts`, imported where needed. Kill `window.__themeConfig`.
- Port `font-manager.js` similarly.
- Port `navigation.js` (back button + scroll class) — keep as a `<script>` in `Default.astro`.
- Port `image-zoom.js` → can stay vanilla; just gets a clean entry point.

**Done criteria:** no more global functions called from inline scripts in templates. `assets/js/core/ui-components.js` deleted.

### Phase 7 — `transition:persist` decisions
`<ClientRouter />` and the view-transition direction logic landed in Phase 1. This phase is about what survives across navigations.

- Apply `transition:persist` to the music widget so audio doesn't restart on nav
- If a background video gets added, persist it the same way
- Header is intentionally **not** persisted — it changes between home and sub variants
- Re-validate Safari behavior with persistent elements in place (different surface than Phase 1's transition test)
- Delete `_sass/base/_view-transitions.scss`'s cross-document `@view-transition` declaration since same-document is now the default; keep the keyframes and per-name animations
- Audit any remaining `DOMContentLoaded` references in code we own and convert them — Phase 1's lifecycle rule should have caught these already, but a final sweep is cheap

**Done criteria:** music keeps playing across navigations; no `DOMContentLoaded` left in our own code (Bucket 3 files excluded until Phase 6).

### Phase 8 — SCSS modernization (optional, can wait)
- Migrate `_sass/` from `@import` to `@use`/`@forward`
- Decide per component: scope styles inside `.astro`, or keep global
- Remove the deprecation silencers in `astro.config.mjs`
- Re-export `/style/export.css` as a build artifact (Astro endpoint or separate Vite entry)
- Update `assets/export-guide.txt` to reference the new paths

**Done criteria:** no sass deprecation warnings; design-system export still serves at `/style/export.css`.

### Phase 9 — SEO + OG image pipeline
- Port `scripts/generate_previews.rb` to Node. Options: `@vercel/og` (React/JSX), `satori` + `sharp`, or `@napi-rs/canvas`. Budget half a day.
- Replace the Ruby generator step in the GH Actions workflow
- `@astrojs/sitemap` integration (replaces `jekyll-sitemap`)
- Validate all `redirect_from` → `redirects` mappings

**Done criteria:** preview images generate at build time; sitemap correct; redirects round-trip.

### Phase 10 — Cutover
- Final pass: every URL on Jekyll resolves on Astro
- Cloudflare Pages: swap `fuckmanik.com` from master to astro branch
- GH Pages: either retire and put manik.cc on Cloudflare Pages too, or update the workflow to build Astro and publish (Astro has GH Pages docs for this)
- Merge `astro` → `master`, retire the branch
- Delete remaining reference dirs: `_includes/`, `_layouts/`, `_sass/`, `_more/`, `_posts/`, `_data/categories.yml`, `assets/css/main.scss`

---

## Gotchas already learned

### Markdown `layout:` front matter is a trap
Astro's markdown loader treats `layout:` as a component import. Loading `_posts/*.md` via `import.meta.glob` exploded immediately on `_posts/2020-02-06-gumble-mle.md` because Astro tried to resolve a component called `post`. Workaround in the spike: read as `?raw` and parse front matter manually. **Real fix:** during Phase 2, strip `layout:` from posts when moving them to `src/content/posts/`.

### SCSS deprecation noise
Sass 1.83 warns about `@import`, `global-builtin`, `color-functions`, `mixed-decls` patterns in the existing tree. Silenced in `astro.config.mjs` for now. Cleanup is Phase 8, not blocking.

### `_includes/icons/` consumed via `import.meta.glob`
The icon set stays in place. The pattern in `src/components/Icon.astro` (`?raw` glob + class injection via string replace) preserves the exact same SVG output as the Jekyll `icon.html`, but with a build-time error if a name is wrong. Don't move the icons.

### CSS link tag in dev vs production
In dev, Vite injects CSS via `<script type="module" src=".../main.scss">`. In prod, Astro emits a real `<link rel="stylesheet">`. Don't be alarmed by the missing `<link>` in dev `curl` output.

### Canonical / OG / schema URLs derive from `Astro.site`
`src/data/site.ts` no longer carries a `url:` field. `Default.astro` and `StructuredData.astro` read `Astro.site!.origin` instead, which respects `astro.config.mjs`'s `site` (set to `https://astro.manik.cc` by default, overridable via `SITE_URL` env var). This is how the staging deployment doesn't claim to be the production Jekyll site to crawlers and social previews. Set `SITE_URL=https://manik.cc` in the Cloudflare prod build env at cutover.

### Existing `assets/` is symlinked into `public/`
This is the cheapest way to keep `/assets/*` URLs working while we migrate. As individual JS files move (Bucket 1 or Bucket 3), delete them from `assets/` and add to `public/assets/` directly if needed. Astro/Vite follows the symlink.

---

## Library decisions

A one-time audit, sorted by verdict so future-you doesn't re-litigate.

### Adopt
| Library | Replaces | Phase | Why |
|---|---|---|---|
| `astro-icon` (+ an Iconify set) | hand-managed `_includes/icons/*.svg` | 0.5 | Tree-shaken icons via a single wrapper component. Kills the "add a new icon = copy an SVG file" friction. The wrapper hides the icon set from callsites, so switching sets later is a one-file change. |
| Astro `<Image>` | hand-written `<img>` tags for static images | 5 | AVIF/WebP, responsive srcsets, inferred dimensions, blurry placeholders. Add `media.manik.cc` to `image.domains` for R2-hosted manifest images. |
| Shiki (built-in) | Rouge syntax highlighting | 2 | Free with Astro markdown. Better output than Rouge, no runtime JS. |
| Bundled `marked` (npm) | `marked@15.0.7` from jsdelivr CDN | 4 | Removes a runtime network hop on product/readme pages; version pinning that survives CDN outages. |
| `@astrojs/sitemap` | `jekyll-sitemap` | 9 | Already planned. |
| `@astrojs/partytown` | inline GA `<script>` in head | 7+ optional | Offloads GA to a worker. Real Core Web Vitals win if Phase 7 doesn't already solve it. |
| `@astrojs/check` | nothing | any | TS checking in CI. Drop-in. |

### Rejected (keep hand-rolled)
- **medium-zoom / PhotoSwipe** — replacing `image-zoom.js` loses gallery prev/next nav, captions, meta lines, and touch behavior. 508 lines of custom code earn their keep.
- **`<details>/<summary>`** — replacing `ExpandableSection` loses the max-height animation.
- **color-thief in `color-palette.js`** — possible Phase 4 swap if rewriting that tool feels right; not blocking, and may lose tool-specific behavior.
- **Pagefind** — current "search" is client-side filter, not full-text corpus search. Only adopt if expanding scope to real search.
- **KaTeX + remark-math** — adopt **only** when a post actually needs math. Currently no post sets `use_math:`.

### Magpie traps (explicit no)
- React/Vue/Svelte islands "for the right place" — no current use case
- Tailwind — destructive to the existing design system + export
- `astro-seo` — hand-rolled OG/meta already works
- date-fns / dayjs — native `Intl.DateTimeFormat` covers our needs
- A typed Last.fm SDK — overkill for one widget

## Decisions deferred

- **Where does `assets/export.scss` (design system export) live in the new world?** Likely a dedicated Vite build entry or an Astro endpoint. Phase 8.
- **Move blog URLs to `/blog/<slug>` or keep `/YYYY/MM/DD/<slug>`?** Keep current shape. `redirect_from` handles legacy URLs already.
- **Adopter for React/Svelte/Vue?** None unless a specific tool/page demands it. Default = vanilla in `<script>` tags.
- **GH Pages or fully Cloudflare?** Decide at Phase 10. Cloudflare-only is simpler ops.
- **Admin panel (`admin/`)?** Excluded from build in current Jekyll setup; stays excluded. Lives on the home server, not the static site.

---

## Working notes

A scratch area for "I noticed X while porting Y" observations. Don't be precious — write things down, move them up into the plan when they become real.

- [ ] Header's `view-transition-name` rules in `_view-transitions.scss` may need rework once `<ClientRouter />` lands (Phase 1)
- [ ] Inline `onclick="handleSiteNameClick(...)"` survives the port but feels wrong long-term — convert during Phase 6 chrome rewrite
- [ ] `index.astro`'s spike-mode `parseFrontmatter()` regex needs deletion in Phase 2
