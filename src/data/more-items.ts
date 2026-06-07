import { paintingMoreItems } from './more/paintings.ts';
import { thingMoreItems } from './more/things.ts';

export type { MoreItemData } from './more/types.ts';

export const astroMoreItems = [
  ...paintingMoreItems,
  ...thingMoreItems,
];
