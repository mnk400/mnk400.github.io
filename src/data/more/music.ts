import type { MoreItemData } from './types.ts';

export const musicMoreItems: MoreItemData[] = [
  {
    id: 'music/music',
    title: 'Music',
    description: 'Lists my top 9 albums on last.fm from past week.',
    tags: ['music', 'lastfm', 'albums', 'stats'],
    redirectFrom: ['/more/music'],
  },
  {
    id: 'music/ipod',
    title: 'iPod',
    description: 'Listen to my playlist on an iPod.',
    image: '/assets/images/previews/ipod.png',
    tags: ['music', 'player', 'playlist', 'nostalgia'],
    redirectFrom: ['/more/ipod'],
  },
];
