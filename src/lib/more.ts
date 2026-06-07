import { getMoreCategory } from '../data/categories.ts';
import { astroMoreItems, type MoreItemData } from '../data/more-items.ts';

export interface MoreItem extends Omit<MoreItemData, 'isHub' | 'listed' | 'url' | 'tags' | 'redirectFrom'> {
  url: string;
  root: string;
  groupPath: string;
  isHub: boolean;
  listed: boolean;
  tags: string[];
  redirectFrom: string[];
}

export interface MoreGroup {
  path: string;
  root: string;
  label: string;
  chip: string;
  sort: 'title' | 'order';
  rootHub?: MoreItem;
  hub?: MoreItem;
  items: MoreItem[];
}

function normalize(item: MoreItemData): MoreItem {
  const segments = item.id.split('/').filter(Boolean);
  return {
    ...item,
    isHub: item.isHub === true,
    listed: item.listed !== false,
    url: item.url ?? `/${item.id}/`,
    root: segments[0] ?? '',
    groupPath: segments.slice(0, -1).join('/'),
    tags: item.tags ?? [],
    redirectFrom: item.redirectFrom ?? [],
  };
}

function compareByTitle(a: MoreItem, b: MoreItem): number {
  return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
}

function compareByOrder(a: MoreItem, b: MoreItem): number {
  const aOrder = a.order ?? Number.POSITIVE_INFINITY;
  const bOrder = b.order ?? Number.POSITIVE_INFINITY;
  return aOrder - bOrder || compareByTitle(a, b);
}

export const moreItems: MoreItem[] = astroMoreItems
  .map(normalize)
  .sort((a, b) => a.id.localeCompare(b.id));

const listedMoreItems = moreItems.filter((item) => item.listed);
const moreLeafItems = listedMoreItems.filter((item) => !item.isHub && item.groupPath.length > 0);

export function getMoreRoots(): string[] {
  return Array.from(new Set(moreLeafItems.map((item) => item.root))).sort();
}

export function getMoreGroups(): MoreGroup[] {
  const hubsByUrl = new Map(
    listedMoreItems.filter((item) => item.isHub).map((item) => [item.url, item]),
  );
  const byPath = new Map<string, MoreItem[]>();

  for (const item of moreLeafItems) {
    const existing = byPath.get(item.groupPath);
    if (existing) existing.push(item);
    else byPath.set(item.groupPath, [item]);
  }

  return Array.from(byPath.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, items]) => {
      const root = path.split('/')[0] ?? path;
      const groupSlug = path.split('/').at(-1) ?? path;
      const rootCategory = getMoreCategory(root);
      const groupCategory = getMoreCategory(path);
      const sort = groupCategory?.sort ?? rootCategory?.sort ?? 'title';
      const sortedItems = [...items].sort(sort === 'order' ? compareByOrder : compareByTitle);

      return {
        path,
        root,
        label: groupCategory?.label ?? rootCategory?.label ?? groupSlug,
        chip: groupCategory?.chip ?? groupSlug,
        sort,
        rootHub: hubsByUrl.get(`/${root}/`),
        hub: hubsByUrl.get(`/${path}/`),
        items: sortedItems,
      };
    });
}

export function getMoreSearchText(item: MoreItem, group: MoreGroup): string {
  const rootCategory = getMoreCategory(item.root);
  return [item.title, item.shortTitle, item.description, rootCategory?.label, group.label, ...item.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getMoreRedirects(): Array<{ from: string; to: string }> {
  return moreItems.flatMap((item) => item.redirectFrom.map((from) => ({ from, to: item.url })));
}
