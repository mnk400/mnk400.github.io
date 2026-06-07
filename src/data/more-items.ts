import { archiveMoreItems } from './more/archive.ts';
import { appMoreItems } from './more/apps.ts';
import { cliToolMoreItems } from './more/cli-tools.ts';
import { paintingMoreItems } from './more/paintings.ts';
import { thingMoreItems } from './more/things.ts';

export type { MoreItemData } from './more/types.ts';

export const astroMoreItems = [
  ...appMoreItems,
  ...archiveMoreItems,
  ...cliToolMoreItems,
  ...paintingMoreItems,
  ...thingMoreItems,
];
