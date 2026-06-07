import type { ProductItemData } from './products.ts';

export const appProductItems = [
  {
    id: 'apps/gulp',
    title: 'Gulp',
    tags: ['app', 'macos', 'swiftui', 'gallery-dl'],
    kind: 'native',
    description: 'Native macOS app for gallery-dl with history and log management',
    redirectFrom: ['/more/gulp'],
    icon: 'https://raw.githubusercontent.com/mnk400/Gulp/main/Assets/gulp.png',
    tagline: 'A native macOS front-end for gallery-dl, built with SwiftUI.',
    repo: 'mnk400/Gulp',
    download: {
      url: 'https://github.com/mnk400/Gulp/releases/latest',
      label: 'Download for macOS 26+',
      icon: 'apple-logo',
    },
    install: [
      {
        label: 'Homebrew',
        command: 'brew tap mnk400/tap && brew install --cask gulp --no-quarantine',
        displayCommand: 'brew install --cask gulp',
      },
    ],
    meta: ['macOS 26+', 'Free & open source'],
    heroImage: 'https://raw.githubusercontent.com/mnk400/Gulp/main/Assets/ui.png',
    heroImageWidth: 2081,
    heroImageHeight: 1426,
    features: [
      {
        icon: 'clock-counter-clockwise',
        title: 'Download history',
        body: 'Revisit past downloads and rerun them whenever you want.',
      },
      {
        icon: 'list-bullets',
        title: 'Per-download logs',
        body: 'Inspect what gallery-dl saw, even after the run completes.',
      },
      {
        icon: 'globe',
        title: 'Wide support',
        body: 'Anywhere gallery-dl goes, Gulp goes out of the box.',
      },
      {
        icon: 'app-window',
        title: 'Native SwiftUI',
        body: 'Lightweight; small native macOS binary.',
      },
    ],
  },
] satisfies ProductItemData[];

export const appMoreItems = appProductItems;
