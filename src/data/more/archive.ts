import type { MoreItemData } from './types.ts';

export const archiveMoreItems = [
  {
    id: 'archive',
    isHub: true,
    title: 'Archive',
    shortTitle: 'Archive',
    url: '/archive/',
    image: '/assets/images/previews/archive.jpg',
    description: 'Small browsable archives of paintings, objects, gear, and other things I like.',
  },
] satisfies MoreItemData[];
