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

## The component pattern (unified)

Every component is a `.astro` file. Heavy logic that's shared across components, or any infrastructure that registers document-level handlers, lives in `src/lib/*.ts`.

```
src/components/Thing.astro      ← the API: typed props + template + thin <script>
src/lib/thing.ts                ← (optional) heavy logic, shared state, document handlers
```

### The .astro file

Renders the markup contract. Holds a co-located `<script>` block. The script is one of:
- **Short and self-contained** — inline wiring that scans `[data-thing]` on `astro:page-load` and decorates (see `ExpandableSection.astro`, `SelectionSwitch.astro`).
- **Imports a lib** — `import '../lib/thing.ts'` triggers the lib's side-effect registration (see `ZoomableImage.astro`).

### The lib file (when needed)

A `src/lib/*.ts` module that:
- Exports the public API as functions (`getActiveTheme`, `openZoom`).
- Has module-level side effects that register document handlers on first import.
- Is imported by the `.astro` script. Vite/Astro **dedupes the module across all importers**, so the handlers register exactly once per page.

### How markdown uses these components

Markdown can't invoke Astro's JSX syntax (`<Thing prop={...}>` won't work in a `.md` file). What markdown **can** do is write the raw HTML that matches the component's contract — the same DOM the `.astro` template would have rendered. The component's script doesn't care where the matching markup came from:

```astro
{/* .astro callsite — typed props, build-time checked */}
<ZoomableImage src="/cool.jpg" alt="Cool" width={3943} height={2958} />
```

```html
<!-- markdown — write the contract directly -->
<img src="/cool.jpg" alt="Cool" data-zoomable width="3943" height="2958" loading="lazy">
```

### One caveat: markdown-only pages

If a page renders the .astro component anywhere, its script is bundled and the lib gets loaded. If a page only has markdown that hand-writes the contract markup (and never imports the .astro component), the lib never loads → the contract is dead markup.

**Fix:** for components that markdown can author, `Default.astro` pre-imports the lib:

```astro
<!-- Default.astro -->
<script>
  import '../lib/image-zoom.ts';
</script>
```

This is the single concession that makes markdown-only pages "just work". Only needed for libs that markdown can hit (currently `image-zoom`; in the future, whatever else).

### Choosing the shape for a new component

Decide what each piece looks like, in this order:

1. **It's always a `.astro` file.** Never start with a custom element or a bare lib module.
2. **Is the behavior heavy or shared?** If yes, extract a `src/lib/*.ts` module the .astro imports. Otherwise the .astro's inline `<script>` holds the wiring.
3. **Will markdown ever author this?** If yes, ensure the `<script>` registers behavior via document-level handlers (not by querying the .astro instance's own subtree), and add the lib import to `Default.astro`.

That's the whole rule. No custom-element vs .astro split. No bare `src/lib/` modules acting as components.

### Concrete examples

| Component | .astro file | Lib module | Why |
|---|---|---|---|
| `ExpandableSection` | template + 60-line script | none | Per-instance widget, short script, no shared state |
| `SelectionSwitch` | template + 100-line script | none | Same as above, slightly heavier script still fits inline |
| `ThemeSwitcher` | template + 25-line script | `lib/theme.ts` | Script wires `change` event to `setTheme()`. Heavy state lives in lib because `Default.astro` also imports it for pre-paint apply |
| `ZoomableImage` | template + `import '../lib/image-zoom.ts'` | `lib/image-zoom.ts` (500 lines, singleton lightbox + document handlers) | Heavy infra, used in markdown too |
| `Footer` / `MusicWidget` | template only, no script | none | Pure markup |

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

### Bucket 3 — Shared infrastructure (lift just-in-time)

**Updated after Phase 1.** The original plan deferred all Bucket 3 rewrites to a single late phase. Phase 1 proved that strategy doesn't survive client routing — globals wired via inline template scripts get orphaned when the DOM swaps. So Bucket 3 splits into three sub-buckets, each with its own rule:

**B3a — State utilities** (`theme-manager.js`, `font-manager.js`, `theme-config.js`, `url-params.js`)

App-level state that needs to be owned by Astro. Convert to TS modules under `src/lib/` when the first Astro consumer (a switcher component) needs them. The legacy JS files keep existing on disk and continue serving at their public URLs for external design-system consumers — we just stop loading them into Astro pages.

**B3b — Generic widgets** (the `init*` functions inside `ui-components.js`: selection switch, dropdown, search, range slider, image upload, expandable section, copy-to-clipboard, reveal cards)

Each widget gets lifted to a self-owning Astro component when an Astro page first needs it. The lifted component sets its own `data-*-initialized="true"` guard so the legacy `ui-components.js` (still loaded for non-ported pages) skips it. When all consumers of a given widget have been lifted, the corresponding code path in `ui-components.js` is deleted.

**B3c — Page-specific scripts** (`lastfm.js`, `location-time.js`, individual game/tool JS)

These were always page-local in Astro's model. The minimal patch is correct: change `DOMContentLoaded` → `astro:page-load`, add an idempotency guard if the script registers anything that would stack on re-firing (e.g. `setInterval`). Don't restructure them. They get deleted as their owning page is ported under the bucket-1 rule.

This patch is a bridge, not the long-term pattern. If a page-specific script is substantially touched, shared by multiple Astro pages, or already doing enough work that typed data/contracts would help, move it toward the Astro-native shape instead: bundled TS in `src/lib/*.ts` or a page-local imported module, with explicit `init(...)`/cleanup APIs and no dependency on public `window.*` globals. Use the bridge only to preserve behavior during the migration without rewriting the feature.

**Reclassified in Phase 2:** `image-zoom.js` started here but moved to B3b — it's used by every page with images (blog posts, archive paintings, future tool/product pages), so the cost of lifting once paid for itself immediately. Now lives as `src/lib/image-zoom.ts` + `src/components/ZoomableImage.astro`, following the unified component pattern (see "The component pattern" section). The `.astro` component is the typed API for callsites; the lib holds the singleton lightbox controller + document handlers. Markdown posts hand-write `<img data-zoomable>` and `Default.astro` pre-imports the lib so the handler is registered on every page. Legacy `assets/js/components/image-zoom.js` stays on disk for the design-system export per AGENTS.md.

**Why this split:** the cost of lifting is per-widget, not per-codebase. If you only need a switcher today, you only lift the switcher. The hard rule is "no NEW consumers of legacy globals from Astro pages" — every page port either uses already-lifted components, or lifts what it needs in the same commit.

Examples that stay as Bucket 3 reference (not lifted yet, no Astro consumer): `_sass/` (consumed via Vite loadPaths, fine as-is).

---

## Lifecycle rule (mandatory for every interactive port)

`<ClientRouter />` is enabled from Phase 1 onward (see phases below). That means navigations are **same-document** — `DOMContentLoaded` fires once, not on every page change. Any new code that depends on first-paint-time init **must** register against Astro's lifecycle events, not `DOMContentLoaded`.

```js
// ❌ won't re-run after client navigation
document.addEventListener('DOMContentLoaded', init);

// ✅ runs on initial load AND every client-side page change
document.addEventListener('astro:page-load', init);
```

For component-local behavior, use a plain `<script>` inside the `.astro` file (Astro bundles it, deduplicates across the page, and processes TypeScript). Inside that script, hook `astro:page-load` for any per-navigation setup. **Do not reach for `is:inline` by default** — it opts the script out of bundling, runs it eagerly per-document, and loses TypeScript. Reserve `is:inline` for cases that genuinely need it:

- **Pre-paint setup** that must run synchronously before CSS resolves (theme/font apply in `Default.astro`).
- **Third-party CDN scripts** (MathJax, gtag bootstrap) that can't be bundled.
- **Inline config snippets** that emit literal JSON/JS into the document (JSON-LD, `window.dataLayer = ...`).
- **Deliberate `data-astro-rerun`** cases — only when a script must re-execute on each navigation.

For external modules loaded via `<script src="...">`: same rule, the file's top-level event listener uses `astro:page-load`.

**No new inline scripts in templates that wire globals.** A pattern like:

```astro
<script>initSwitch('themeSwitch', val => setTheme(val))</script>
```

inside `Header.astro` looks like the Jekyll inline-include style — but it runs ONCE on initial load and registers handlers on what is then the live DOM. After client-side navigation the new DOM has no listeners, even though the Jekyll-style helper still exists on `window`. **Replacement:** an Astro component that owns markup + co-located script for its own behavior (`ThemeSwitcher.astro`, etc.). This was the Phase 1 lesson — bandaging globals does not survive client routing.

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

### Phase 0.5 — `astro-icon` swap ✅ done
Every page port from Phase 1 onward references the Icon component. Swap to `astro-icon` now so we never have to re-migrate icon names later.

- Install `astro-icon` + the Iconify icon-set package we want to use
- Add the integration in `astro.config.mjs`
- Rewrite `src/components/Icon.astro` as a thin wrapper around `astro-icon`'s `<Icon>` that preserves the existing callsite API (`<Icon name="arrow-down-left" weight="bold" />`) and applies our defaults (`class="icon"`, `aria-hidden`)
- Delete `_includes/icons/` and `_includes/icon.html` once nothing in `src/` references them via `import.meta.glob`

The wrapper is the only file in the codebase that knows which Iconify set we use. Adding a new icon = use its name; no SVG copying. Swapping icon sets later = change one file.

**Done criteria:** all current Icon usages render unchanged; `_includes/icons/` and `_includes/icon.html` deleted; new icons added by name, no SVG files copied.

### Phase 1 — Static pages + `<ClientRouter />` ✅ done
This phase deliberately bundles the second-page port with client-router setup. We need a second URL to validate transitions against; doing both together avoids a separate retrofit later, and means every interactive port from Phase 4 onward is already tested against same-document navigation.

Pages:
- `/about` → port `about/index.md`, define `Post.astro` layout, port breadcrumb variant of Header
- `/love` → tiny static page
- `/404` → port `404.html`

Client router setup (was Phase 7, moved here):
- Add `<ClientRouter />` to `Default.astro`
- Port `view-transitions.js`: direction detection (forward/back) and the breadcrumb-name swap logic move from `pageswap`/`pagereveal` (cross-document) to `astro:before-swap` / `astro:after-swap` hooks
- Lift the chrome widgets touched by these pages into self-owning Astro components instead of re-running `ui-components.js` globals
- Verify SCSS view-transition rules in `_sass/base/_view-transitions.scss` still apply — they should, but Safari needs a click-through test

Deferred to Phase 7 (still): `transition:persist` decisions for the music widget and any background video — those need real consumer components in place first.

**Done criteria:** four URLs working, `Post.astro` layout established, Header.astro covers both variants, client-side navigation between any two pages doesn't lose theme switcher / expandable / music-widget behavior, browser back-button still triggers the reverse-direction transition. **Additionally** (added mid-phase): all chrome rendered on the four URLs has been lifted to self-owning Astro components — `ThemeSwitcher`, `FontSwitcher`, `SettingsPanel`, `SelectionSwitch`, `ExpandableSection` — with no remaining inline `<script>initGlobal(...)</script>` template wiring.

### Phase 2 — Content collections + blog ✅ done
- Moved `_posts/*.md` → `src/content/posts/*.md`
- Defined `posts` collection in `src/content.config.ts` (Astro 5 location) with a Zod schema. Date optional in frontmatter — derived from filename when absent (Jekyll parity).
- Stripped `layout: post` from each post; renamed `use_math: true` → `useMath: true` in gumble-mle
- Built dynamic route `src/pages/[year]/[month]/[day]/[slug].astro` with `getStaticPaths()` parsing the filename
- Replaced the spike's hand-rolled `?raw` parser in `src/pages/index.astro` with `getCollection('posts')`
- De-Liquided post content during the move: replaced 11 `{% include zoomable-image.html %}` with plain `<img data-zoomable>`, 9 `{% highlight lang %}` blocks with fenced code blocks (Shiki highlights at build time, no runtime JS), and 4 `{% include selection-switch.html %}` with inline `<div data-selection-switch>` markup (the lifted SelectionSwitch script auto-initializes any matching node).
- Added `timeZone: 'UTC'` to date formatter in `Post.astro` so frontmatter dates display as-written regardless of build-machine TZ
- Skipped: pagination (only 6 posts, current archive on `/` shows all in one expandable; defer until count grows). `redirect_from` (no posts use it; relevant only for Phase 3's `_more/`).
- Kept `_layouts/post.html` as Bucket 2 reference — still consumed by many unported `_more/`, `art/`, `more/`, `photos/` pages. Delete when its last consumer migrates (Phase 5).
- Patched migrated blog-only scripts that are now loaded by Astro routes to use `astro:page-load` with cleanup where they register global listeners.

### Phase 3 — `/more/` and category routing ✅ done
This is the one that justifies the migration. If this phase doesn't feel meaningfully better than Liquid, stop and reconsider scope.

New shape:

- `src/data/categories.ts` owns typed category display metadata for Astro. Keep `_data/categories.yml` until the legacy Jekyll consumers are gone.
- `src/data/more-items.ts` is only an aggregator for Astro-owned `/more` metadata. Real data lives in family files like `src/data/more/paintings.ts` and `src/data/more/things.ts`; one-off pages can use a small misc family until they grow.
- `src/lib/more.ts` reads only from `src/data/more/*.ts` — no Jekyll bridge. `/more/` lists what has been ported; unported tools live on the production Jekyll site until their port commit adds the data entry.
- `src/pages/more/index.astro` renders the index from typed metadata and small Astro components. It must not depend on Liquid includes or `site.more`.
- Old `/more/<slug>` URLs are generated as redirects from each item's `redirect_from`.
- Category hubs and families use dedicated Astro routes/components rather than generic `layout:` front matter. `/archive/` is a real hub page, not a redirect to paintings. For repeated archive families, prefer dynamic routes like `src/pages/archive/paintings/[artist].astro` and `src/pages/archive/things/[thing].astro` plus typed gallery components over copied pages.

Each Phase 4 port adds its data entry in the same commit as its route — typed shape per family, defined in `src/data/more/*.ts`. The shape captures only what the new world reads: listing metadata, routing redirects, and any family-specific fields (gallery source, entity, etc.). Product/readme/hero fields will be added when those pages port, not before.

Implementation slice:

1. Lift `_data/categories.yml` → `src/data/categories.ts` (typed), without deleting the legacy YAML yet.
2. Define `more` metadata in `src/data/more/*.ts` family files. One entry per Astro-served URL.
3. Port `more/index.html` → `src/pages/more/index.astro`. Replace `assign | push | sort` with helper functions / `Map`. The index lists only ported items.
4. Add the compatibility redirect route for old `/more/<slug>` URLs from each item's `redirect_from`.
5. Port `_more/archive/paintings/index.html` → `src/pages/archive/paintings/index.astro`, with hub/items metadata in `src/data/more/paintings.ts`.
6. Port `src/pages/archive/index.astro` as a real archive family hub, using the same archive card component as paintings/things instead of redirecting to a single family.
7. Update Header.astro's breadcrumb logic to use the typed categories module.
8. Update StructuredData.astro's BreadcrumbList logic the same way.
9. Delete `more/index.html` and each ported `_more/**` source file after its Astro route/data replacement lands. Keep `_includes/header.html` until the last legacy Jekyll reference page/layout that includes it is gone.

**Done criteria:** `/more/`, `/archive/`, `/archive/paintings/`, `/archive/things/`, old `/more/<slug>` redirects, breadcrumbs all work; old Bucket 1 hub files and ported `_more/**` sources are deleted; `_includes/header.html` remains only if legacy reference pages still consume it.

### Phase 4 — Tools and games (volume work) ✅ done
- Each `_more/<cat>/<slug>.html` → `src/pages/<cat>/<slug>.astro`
- Each port adds its typed `/more/` entry in the matching family file (`src/data/more/apps.ts`, `cli-tools.ts`, `games.ts`, etc.) and imports that family from `src/data/more-items.ts`.
- Script references move from front matter `scripts: [...]` to explicit page-local `<script>` imports/tags in the `.astro` route. Do not add new `scripts:` prop consumers.
- Bucket 1: each page-local JS file moves from `assets/js/games/` / `assets/js/tools/` to a per-page co-located script or stays under `/assets/js/` only as a temporary bridge if cleaner.
- **No structural rewrites**, but the lifecycle rule applies: if the original JS used `DOMContentLoaded`, change that single line to `astro:page-load` during the port. Game/tool internals stay untouched.
- Delete the matching `_more/<cat>/<slug>.html` source in the same commit that adds the Astro route/data.

Recommended order:

1. **Product pages first:** port `_more/apps/gulp.html` and `_more/cli-tools/{bend,nfo,rex}.html`.
   - Add `src/data/more/apps.ts` and `src/data/more/cli-tools.ts` with product/readme fields.
   - Add a typed `ProductPage.astro` component rather than a generic front-matter layout.
   - Lift only the product behaviors needed now: copy buttons, release metadata, README rendering. Keep them component/lib owned, not `ui-components.js` globals.
   - Fetch README markdown at build time through the `readmes` content collection, rewrite GitHub-relative links/images in `src/lib/load-readme.ts`, and render with Astro's normal markdown pipeline. No runtime markdown parser.
2. **Simple games/tools:** port `random-wiki`, `tictactoe`, `minesweeper`, `gameoflife`, and `colordle`.
   - Preserve markup/behavior; convert lifecycle hooks to `astro:page-load`.
   - Prefer co-located scripts once touched, especially for games.
3. **Utility-heavy tools:** port `ascii`, `color-palette`, `gradient-generator`, `historical-browser`, `camera`, `circles`, and `flappybird`.
   - Lift shared dynamic controls only when the page needs them.
   - Keep camera/canvas helper modules scoped and avoid new `window.*` contracts where practical.
4. **Music pages last in Phase 4:** port `music` and `ipod` after the simpler interactive pages prove the route/script pattern.
   - These are the bridge into Phase 7's `transition:persist` decisions.

**Done criteria:** every URL under `/games/`, `/cli-tools/`, `/fun-tools/`, `/image-tools/`, `/apps/`, and `/music/` works, including arriving via client-side navigation from another ported page.

### Phase 5 — Remaining image gallery + archive pages ✅ done
- Paintings moved into Phase 3 because they are the first high-value `/more/` family. Keep the same pattern for the remaining gallery/archive pages: typed Astro data, dedicated routes/components, then delete the matching Jekyll source.
- Port any remaining `_includes/image-gallery.html` consumers to `src/components/ImageGallery.astro` with **typed props** (no more 18 data-attrs).
- Refactor any remaining `assets/js/media/image-gallery.js` consumers toward `src/lib/image-gallery.ts`; new Astro consumers should not read DOM-level data attributes.
- Port `/photos/` page
- Delete `_includes/image-gallery.html`

**Done criteria:** all archive pages and `/photos/` work; ImageGallery component has typed props; gallery JS doesn't read DOM-level data-attrs anymore.

### Phase 6 — Retire remaining legacy paths (housekeeping) ✅ done
**Reshaped after Phase 1.** Under the just-in-time lifting rule (see Bucket 3), most rewrites will have happened as part of the page phases that needed them. This phase is the cleanup pass, not a big lift:

- Audit `assets/js/core/ui-components.js`: for each `init*` function, identify whether all Astro consumers have moved to lifted components. Delete code paths that no longer have any consumer (Astro or legacy reference page).
- Audit `assets/js/core/theme-manager.js`, `font-manager.js`, `theme-config.js`, `url-params.js`: if no Astro page loads them, decide their long-term status (probably handed to Phase 8's design-system export pipeline).
- Audit `assets/js/components/image-zoom.js`, `readme-renderer.js`, `release-meta.js`: same exercise. Product pages now use build-time README loading in `src/lib/load-readme.ts` plus `src/lib/product-release.ts`; the legacy files remain only for design-system export / unported reference pages until final cleanup.
- Final sweep: any `<script>` in a template that wires a global gets one last review. None should remain.

**Done criteria:** every line of `assets/js/core/` and `assets/js/components/` has a justified consumer (Astro page, legacy reference page, or design-system export), or is deleted. No `window.*` writes from any Astro `.astro` file.

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
- GH Pages: put manik.cc on Cloudflare Pages too, or update the workflow to build Astro and publish (Astro has GH Pages docs for this)
- Merge `astro` → `master`, retire the branch
- Delete remaining reference dirs: `_includes/`, `_layouts/`, `_sass/`, `_more/`, `_posts/`, `_data/categories.yml`, `assets/css/main.scss`

---

## Gotchas already learned

### Markdown `layout:` front matter is a trap
Astro's markdown loader treats `layout:` as a component import. Loading `_posts/*.md` via `import.meta.glob` exploded immediately on `_posts/2020-02-06-gumble-mle.md` because Astro tried to resolve a component called `post`. Workaround in the spike: read as `?raw` and parse front matter manually. **Real fix:** during Phase 2, strip `layout:` from posts when moving them to `src/content/posts/`.

### SCSS deprecation noise
Sass 1.83 warns about `@import`, `global-builtin`, `color-functions`, `mixed-decls` patterns in the existing tree. Silenced in `astro.config.mjs` for now. Cleanup is Phase 8, not blocking.

### Icons are routed through `astro-icon`
`src/components/Icon.astro` is the only wrapper that knows the Iconify set. Use `<Icon name="..." />` at callsites; do not add new SVG files or `import.meta.glob` icon loaders.

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
| `@astrojs/sitemap` | `jekyll-sitemap` | 9 | Already planned. |
| `@astrojs/partytown` | inline GA `<script>` in head | 7+ optional | Offloads GA to a worker. Real Core Web Vitals win if Phase 7 doesn't already solve it. |
| `@astrojs/check` | nothing | any | TS checking in CI. Drop-in. |

### Rejected (keep hand-rolled)
- **medium-zoom / PhotoSwipe** — replacing `image-zoom.js` loses gallery prev/next nav, captions, meta lines, and touch behavior. 508 lines of custom code earn their keep.
- **`<details>/<summary>`** — replacing `ExpandableSection` loses the max-height animation.
- **color-thief in `color-palette.js`** — possible Phase 4 swap if rewriting that tool feels right; not blocking, and may lose tool-specific behavior.
- **marked** — README product pages render at build time through Astro's markdown pipeline, so we don't need a runtime parser or a bundled replacement for the old CDN script.
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
- [ ] `index.astro`'s spike-mode `parseFrontmatter()` regex needs deletion in Phase 2
- [x] ~~Inline `onclick="handleSiteNameClick(...)"` survives the port but feels wrong long-term~~ — lifted in Phase 1 under the new just-in-time rule
- [x] ~~Trigger-style `<a href="#">` elements get intercepted by `ClientRouter` and run the full transition lifecycle on click — DOM swap wipes any state the click handler just set~~ — Phase 1 fix: triggers (settings, photo reveal, breadcrumb-back) are `<button type="button">`. Rule: if it's not a navigation, it's not an `<a>`.
- [ ] Every future phase opens with a "chrome audit": list the chrome surfaces the new pages touch, identify which need B3a/B3b lifting, lift them in the same commit
- [ ] Phase 6 cleanup target: `index.astro` passes legacy `/assets/js/*` paths through `scripts:` prop, rendered by `Default.astro` as `<script src=... is:inline>`. Bridge pattern, fine for now — each ported page should either lift to a co-located `<script>` or import a processed module from `src/`, never add new `scripts:` consumers.
