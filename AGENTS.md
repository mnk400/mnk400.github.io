# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Build Commands

```bash
bundle install                  # Install Ruby dependencies
bundle exec jekyll serve        # Start dev server at localhost:4000
bundle exec jekyll build        # Build static site to _site/
```

## Architecture

This is a Jekyll static site (portfolio/blog) with vanilla JavaScript and SCSS. No JS frameworks.

### Key Directories

- `_layouts/` - Page templates (default.html wraps everything, post.html for content pages)
- `_includes/` - Reusable Liquid components (header, image-zoom, music-widget, etc.)
- `_sass/` - SCSS organized as: `base/` (variables, mixins) → `components/` → `pages/`
- `assets/js/` - Vanilla JS organized as: `core/` (theme, navigation) → `components/` → `tools/` → `games/`
- `_more/` - Collection-backed interactive tools, games, archives, and subcategory pages
- `more/` - The `/more/` index page, generated from the `_more` collection
- `_posts/` - Markdown blog posts

### Theme System

Themes are defined in `_sass/base/_variables.scss`. Theme manager in `assets/js/core/theme-manager.js` toggles via `data-theme` attribute on `<html>` and persists to localStorage.

### More Collection

The `_more` collection is configured in `_config.yml` with `output: true` and path-based permalinks. Its directory structure is the source of truth for categories and subcategories:

- `_more/games/colordle.html` → `/games/colordle`
- `_more/archive/paintings/monet.html` → `/archive/paintings/monet`
- `_more/archive/paintings/index.html` → hub page for `/archive/paintings/`

The `/more/` index derives its rows from `_more` paths. Direct children render under their top-level category, while nested pages render as full path rows like `archive / paintings`. Category metadata lives in `_data/categories.yml`; use top-level keys (`games`) and full-path keys (`archive/paintings`) for labels, chips, and sort behavior.

Do not use `disabled: true` to hide hub pages from `/more/`. Hub pages are inferred from `index.html` collection documents.

### Patterns

- **SCSS**: Use CSS custom properties from `_variables.scss` and mixins from `_mixins.scss`
- **JavaScript**: IIFE pattern for module encapsulation, event delegation for performance
- **New tools**: Create HTML in `_more/<category>/<slug>.html`, add JS in `assets/js/tools/`, styles in `_sass/pages/_tools.scss`, and update `_data/categories.yml` if adding a category or subcategory
- **Layouts**: Use `layout: post` in front matter for content/tool pages

## Design System Export

This codebase exports a reusable design system consumed by other projects. The export consists of:

- **`assets/export.scss`** — Bundled CSS served at `/style/export.css`
- **`assets/js/core/`** and **`assets/js/components/`** — JS modules loaded by URL
- **`assets/export-guide.txt`** — Plain text reference for AI agents on other codebases

**When to update `export-guide.txt`:** Any time you modify files that are part of the export — design tokens in `_variables.scss`, mixins, component SCSS (`_buttons.scss`, `_cards.scss`, `_forms.scss`, `_grids.scss`, `_image-zoom.scss`), utility classes in `_helpers.scss`, layout wrappers, or any JS file in `core/`, `components/`, or `utils/`. If you add, remove, or rename a CSS class, CSS variable, JS function, or change behavior, reflect it in the guide. Don't update the guide for changes to page-specific styles in `_sass/pages/` or site-specific JS (games, tools).

## Deployment

Push to master branch auto-deploys to both targets:

- **manik.cc** — served via GitHub Pages
- **fuckmanik.com** — served via Cloudflare Pages (project: `mnk400-github-io`)
