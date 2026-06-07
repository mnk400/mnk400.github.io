import type { ProductItemData } from './products.ts';

export const cliToolProductItems = [
  {
    id: 'cli-tools/bend',
    title: 'bend',
    tags: ['cli', 'macos', 'hardware', 'zig', 'tool'],
    kind: 'readme',
    description: 'CLI to read the MacBook lid angle, written in Zig',
    image: '/assets/images/previews/bend.jpg',
    redirectFrom: ['/more/bend'],
    tagline: 'Read the MacBook lid angle from the command line. Written in Zig.',
    repo: 'mnk400/bend',
    branch: 'main',
    readmeImages: [
      {
        path: 'assets/demo.gif',
        width: 800,
        height: 386,
      },
    ],
    install: [
      {
        label: 'Homebrew',
        command: 'brew install mnk400/tap/bend',
      },
      {
        label: 'Shell',
        command: 'curl -fsSL https://raw.githubusercontent.com/mnk400/bend/main/install.sh | bash',
      },
    ],
    meta: ['macOS'],
  },
  {
    id: 'cli-tools/nfo',
    title: 'nfo',
    tags: ['cli', 'terminal', 'system', 'ascii'],
    kind: 'readme',
    description: 'Minimal fetch program CLI',
    redirectFrom: ['/more/nfo'],
    tagline: 'A minimal system fetch program with customizable ASCII art.',
    repo: 'mnk400/nfo',
    branch: 'master',
    readmeImages: [
      {
        path: 'docs/screenshot.png',
        width: 1488,
        height: 990,
      },
    ],
    install: [
      {
        label: 'Homebrew',
        command: 'brew install mnk400/tap/nfo',
      },
    ],
    meta: ['macOS & Linux'],
  },
  {
    id: 'cli-tools/rex',
    title: 'rex',
    tags: ['cli', 'scripts', 'automation', 'tool'],
    kind: 'readme',
    description: 'Dynamic script management CLI',
    redirectFrom: ['/more/rex'],
    tagline: 'Auto-discover your local scripts and run them as a structured CLI.',
    repo: 'mnk400/Rex',
    branch: 'main',
    install: [
      {
        label: 'Homebrew',
        command: 'brew install mnk400/tap/rex',
      },
      {
        label: 'Shell',
        command: 'curl -fsSL https://raw.githubusercontent.com/mnk400/rex/main/install.sh | bash',
      },
    ],
    meta: ['macOS & Linux'],
  },
] satisfies ProductItemData[];

export const cliToolMoreItems = cliToolProductItems;
