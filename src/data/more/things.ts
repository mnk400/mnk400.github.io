import type { ImageGalleryConfig } from '../../lib/image-gallery/index.ts';
import type { MoreItemData } from './types.ts';

export interface ThingGalleryItemData extends MoreItemData {
  source: string;
  galleryName: string;
  gallery: Pick<
    ImageGalleryConfig,
    'captionTitle' | 'captionBody' | 'captionMeta' | 'zoomMeta'
  >;
}

const thingTags = ['archive', 'things', 'objects'];

const thingHubItem = {
  id: 'archive/things',
  isHub: true,
  title: 'Archive of Things',
  shortTitle: 'Things',
  url: '/archive/things/',
  image: '/assets/images/previews/photo.jpg',
  description: 'A small archive of objects, gear, and physical things I like.',
} satisfies MoreItemData;

export const thingGalleryItems = [
  {
    id: 'archive/things/cameras',
    title: 'Cameras',
    shortTitle: 'Cameras',
    tags: [...thingTags, 'cameras', 'photography'],
    image: '/assets/images/previews/cameras.jpg',
    order: 1,
    description: 'A browsable archive of cameras I have owned or used.',
    source: 'https://media.manik.cc/cameras/manifest.json',
    galleryName: 'cameras',
    gallery: {
      captionTitle: ['title'],
      captionBody: ['description'],
      captionMeta: ['meta:Owned'],
      zoomMeta: ['meta:Owned'],
    },
  },
  {
    id: 'archive/things/sweaters',
    title: 'Sweaters',
    shortTitle: 'Sweaters',
    tags: [...thingTags, 'sweaters', 'knitwear', 'clothing', 'wool'],
    image: '/assets/images/previews/sweaters.jpg',
    order: 3,
    description: 'An archive of sweaters I have grown to own in my few years of being alive.',
    source: 'https://media.manik.cc/sweater-album/manifest.json',
    galleryName: 'sweaters',
    gallery: {
      captionTitle: ['title'],
      captionBody: ['description'],
    },
  },
] satisfies ThingGalleryItemData[];

// Things that live under the archive but aren't manifest-backed galleries, so
// they get their own static page instead of riding the [thing] route. Listed
// here so the index card, /more search, and redirects still come for free.
export const thingStaticItems = [
  {
    id: 'archive/things/charms',
    title: 'Charms',
    shortTitle: 'Charms',
    tags: [...thingTags, 'charms', 'decoration', 'fun', 'easter egg'],
    image: '/assets/images/previews/charms.jpg',
    order: 2,
    description: 'Every decorative charm on the site, tipped out into a case.',
    redirectFrom: ['/fun-tools/charms'],
  },
] satisfies MoreItemData[];

export const thingMoreItems = [
  thingHubItem,
  ...thingGalleryItems,
  ...thingStaticItems,
] satisfies MoreItemData[];
