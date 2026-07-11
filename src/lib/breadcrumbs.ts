import { getMoreCategory } from '../data/categories.ts';

// Category crumbs only link when the category has a central index page
// (e.g. /archive/ exists but /games/ doesn't). Derived from the filesystem
// at build time so it can never drift from the actual routes.
const indexPages = import.meta.glob('../pages/**/index.astro');

function categoryHasIndexPage(prefix: string): boolean {
  return `../pages/${prefix}/index.astro` in indexPages;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

function normalizePath(pathname: string): string {
  if (pathname === '/') return '/';
  return `/${pathname.replace(/^\/|\/$/g, '')}/`;
}

function fallbackLabel(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getBreadcrumbs(pathname: string, pageTitle?: string): BreadcrumbItem[] {
  const path = normalizePath(pathname);
  if (path === '/') return [];

  const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const categoryCrumbs: BreadcrumbItem[] = [];

  segments.forEach((_, index) => {
    const prefix = segments.slice(0, index + 1).join('/');
    const category = getMoreCategory(prefix);
    if (!category) return;
    categoryCrumbs.push({
      label: category.label,
      // Only link categories that actually have a central page
      ...(categoryHasIndexPage(prefix) ? { href: `/${prefix}/` } : {}),
    });
  });

  if (categoryCrumbs.length === 0) {
    return [{
      label: pageTitle ?? fallbackLabel(segments.at(-1) ?? ''),
      href: path,
      current: true,
    }];
  }

  const lastCategory = categoryCrumbs.at(-1);
  if (lastCategory?.href && normalizePath(lastCategory.href) === path) {
    lastCategory.current = true;
    return categoryCrumbs;
  }

  return [
    ...categoryCrumbs,
    {
      label: pageTitle ?? fallbackLabel(segments.at(-1) ?? ''),
      href: path,
      current: true,
    },
  ];
}
