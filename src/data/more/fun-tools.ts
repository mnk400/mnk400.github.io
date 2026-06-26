import type { MoreItemData } from './types.ts';

export const funToolMoreItems: MoreItemData[] = [
  {
    id: 'fun-tools/random-wiki',
    title: 'Random Wikipedia',
    description: 'Read a random article from Wikipedia.',
    tags: ['fun', 'wikipedia', 'random', 'reading'],
    redirectFrom: ['/more/random-wiki'],
  },
  {
    id: 'fun-tools/historical-browser',
    title: 'Historical Browser',
    description: 'Browse the internet from the past.',
    image: '/assets/images/previews/browser.png',
    tags: ['archive', 'browser', 'history', 'wayback', 'tool'],
    redirectFrom: ['/more/historical-browser'],
  },
  {
    id: 'fun-tools/camera',
    title: 'Camera Art',
    description: 'Convert your camera feed into real-time ASCII or circle art.',
    tags: ['art', 'camera', 'ascii', 'circles', 'webcam', 'canvas', 'tool'],
    redirectFrom: ['/more/camera', '/more/circles', '/fun-tools/circles'],
  },
];
