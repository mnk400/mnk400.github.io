export interface MoreCategory {
  label: string;
  chip: string;
  sort?: 'title' | 'order';
}

export const moreCategories = {
  apps: {
    label: 'Apps',
    chip: 'apps',
  },
  archive: {
    label: 'Archive',
    chip: 'archive',
    sort: 'order',
  },
  'archive/paintings': {
    label: 'Paintings',
    chip: 'paintings',
    sort: 'order',
  },
  'archive/things': {
    label: 'Things',
    chip: 'things',
    sort: 'order',
  },
  'cli-tools': {
    label: 'CLI Tools',
    chip: 'cli tools',
  },
  'fun-tools': {
    label: 'Fun Tools',
    chip: 'fun',
  },
  games: {
    label: 'Games',
    chip: 'games',
  },
  'image-tools': {
    label: 'Image Tools',
    chip: 'image tools',
  },
  music: {
    label: 'Music',
    chip: 'music',
  },
} as const satisfies Record<string, MoreCategory>;

export type MoreCategoryPath = keyof typeof moreCategories;

export function getMoreCategory(path: string): MoreCategory | undefined {
  return moreCategories[path as MoreCategoryPath];
}
