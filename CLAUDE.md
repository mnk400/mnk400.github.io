# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `more/` - Interactive tools and games (each has HTML page + JS module)
- `_posts/` - Markdown blog posts

### Theme System

Four themes defined in `_sass/base/_variables.scss` (light, dark, blue, red). Theme manager in `assets/js/core/theme-manager.js` toggles via `data-theme` attribute on `<html>` and persists to localStorage.

### Patterns

- **SCSS**: Use CSS custom properties from `_variables.scss` and mixins from `_mixins.scss`
- **JavaScript**: IIFE pattern for module encapsulation, event delegation for performance
- **New tools**: Create HTML in `/more/`, add JS in `assets/js/tools/`, styles in `_sass/pages/_tools.scss`
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
