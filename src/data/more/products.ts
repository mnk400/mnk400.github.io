import type { MoreItemData } from './types.ts';

export interface ProductDownload {
  url: string;
  label: string;
  icon?: string;
}

export interface ProductInstall {
  label: string;
  command: string;
  displayCommand?: string;
}

export interface ProductFeature {
  icon?: string;
  title: string;
  body: string;
}

export interface ProductReadmeImage {
  path: string;
  width?: number;
  height?: number;
}

export interface ProductItemData extends MoreItemData {
  kind: 'native' | 'readme';
  tagline?: string;
  icon?: string;
  repo?: string;
  branch?: string;
  download?: ProductDownload;
  install?: ProductInstall[];
  meta?: string[];
  heroImage?: string;
  heroImageWidth?: number;
  heroImageHeight?: number;
  features?: ProductFeature[];
  readmeImages?: ProductReadmeImage[];
}
