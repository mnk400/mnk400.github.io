import type { ImageGalleryConfig } from '../../lib/image-gallery.ts';
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
    image: '/assets/images/previews/photo.jpg',
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
] satisfies ThingGalleryItemData[];

export const thingMoreItems = [
  thingHubItem,
  ...thingGalleryItems,
] satisfies MoreItemData[];
