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
    title: 'Live ASCII Camera',
    description: 'Convert your camera feed into real-time ASCII art.',
    tags: ['art', 'camera', 'ascii', 'webcam', 'tool'],
    redirectFrom: ['/more/camera'],
  },
  {
    id: 'fun-tools/circles',
    title: 'Circle Camera',
    description: 'Convert your camera feed into real-time circle art.',
    tags: ['art', 'camera', 'webcam', 'canvas', 'tool'],
    redirectFrom: ['/more/circles'],
  },
];
