export interface MoreCategory {
  label: string;
  chip: string;
  sort?: 'title' | 'order';
  // How the group reads on /more. `{items}` becomes the item links; `[text]`
  // links to the group's hub page when it has one. Groups without a sentence
  // fall back to "Label: {items}." so nothing new silently goes missing.
  sentence?: string;
  // Paragraph the sentence belongs to on /more, in reading order.
  paragraph?: number;
  // Items shown inline before the rest fold into "and N more".
  inlineLimit?: number;
}

export const moreCategories = {
  // Key order is /more's reading order.
  archive: {
    label: 'Archive',
    chip: 'archive',
    sort: 'order',
  },
  games: {
    label: 'Games',
    chip: 'games',
    sentence: 'A lot of them are toys, like the small games {items}.',
    paragraph: 1,
  },
  'image-tools': {
    label: 'Image Tools',
    chip: 'image tools',
    sentence: 'There are tools for playing with images, {items}.',
    paragraph: 1,
  },
  'fun-tools': {
    label: 'Fun Tools',
    chip: 'fun',
    sentence: 'Others are just for fun: {items}.',
    paragraph: 1,
  },
  music: {
    label: 'Music',
    chip: 'music',
    sentence: 'And some for music, {items}.',
    paragraph: 1,
  },
  'cli-tools': {
    label: 'CLI Tools',
    chip: 'cli tools',
    sentence: 'A few are more serious, like the command-line tools I use every day, {items}.',
    paragraph: 2,
  },
  apps: {
    label: 'Apps',
    chip: 'apps',
    sentence: 'Sometimes they become a real app, like {items}.',
    paragraph: 2,
  },
  'archive/paintings': {
    label: 'Paintings',
    chip: 'paintings',
    sort: 'order',
    sentence: 'I also keep a browseable [archive of paintings] by artists I love: {items}.',
    paragraph: 3,
    inlineLimit: 6,
  },
  'archive/things': {
    label: 'Things',
    chip: 'things',
    sort: 'order',
    sentence: 'And a few more collections pages of [things] in my life: {items}.',
    paragraph: 3,
  },
} as const satisfies Record<string, MoreCategory>;

export type MoreCategoryPath = keyof typeof moreCategories;

export function getMoreCategory(path: string): MoreCategory | undefined {
  return moreCategories[path as MoreCategoryPath];
}
