import { getMoreCategory } from '../data/categories.ts';

export interface BreadcrumbItem {
  label: string;
  href: string;
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
      href: `/${prefix}/`,
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
  if (lastCategory && normalizePath(lastCategory.href) === path) {
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
