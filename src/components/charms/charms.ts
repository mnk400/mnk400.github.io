// Charm registry — the intrinsic definition of each charm (what it *is*),
// kept separate from where it's pinned (anchor/x/y/rotate, set per placement).
//
// Charm.astro renders a charm's body from its entry here, so a call site only
// has to say `<Charm type="jacket" ... />`. Adding a charm means one entry
// below plus a matching `.charm--<type>` partial under
// styles/partials/charms/. The collection at /archive/things/charms maps over
// CHARMS, so every registered charm shows up there automatically.

// `size` is the charm's default height multiplier over --charm-base-height
// A `size` prop on <Charm> overrides it per placement.
type CharmBase = { size?: number };
export type CharmDef = CharmBase &
  (
    | {
        kind: 'image';
        src: string;
        decoding?: 'sync' | 'async';
        fetchpriority?: 'high' | 'low' | 'auto';
      }
    | { kind: 'svg'; markup: string }
    | { kind: 'text'; sample: string | number } // `sample` is what the gallery shows
  );

const heartSvg = `<svg viewBox="0 0 24 22" role="img"><path d="M12 5.7C10.5 2.9 8.2 1.6 5.9 1.6C2.9 1.6 1.4 4.2 1.4 7.4C1.4 10.7 4.1 13.6 6.9 16.1C8.2 17.3 9.5 18.7 10.5 20C11.2 20.9 12.8 20.9 13.5 20C14.5 18.7 15.8 17.3 17.1 16.1C19.9 13.6 22.6 10.7 22.6 7.4C22.6 4.2 21.1 1.6 18.1 1.6C15.8 1.6 13.5 2.9 12 5.7Z"/></svg>`;

// A Bauhaus-lineage wall clock (Max Bill by way of Junghans), and the only charm
// showing something true: it reads the visitor's clock. Drawn on a 100×100 grid
// so every hand rotates about (50, 50); Charm.astro seeks them to `now` at load.
const clockTicks = Array.from({ length: 60 }, (_, i) =>
  i % 5 === 0
    ? `<rect class="clock-tick clock-tick--hour" x="49.3" y="7.5" width="1.4" height="6.5" transform="rotate(${i * 6} 50 50)"/>`
    : `<rect class="clock-tick" x="49.72" y="7.5" width="0.56" height="3.4" transform="rotate(${i * 6} 50 50)"/>`,
).join('');

const clockSvg =
  `<svg viewBox="0 0 100 100" role="img">` +
  `<defs>` +
  `<radialGradient id="charm-clock-dial" cx="40%" cy="33%" r="78%">` +
  `<stop offset="0%" stop-color="#fdfbf5"/><stop offset="62%" stop-color="#f4f0e6"/>` +
  `<stop offset="100%" stop-color="#e4ddcd"/></radialGradient>` +
  `<linearGradient id="charm-clock-rim" x1="0.25" y1="0" x2="0.75" y2="1">` +
  `<stop offset="0%" stop-color="#cfc9bb"/><stop offset="48%" stop-color="#8b8578"/>` +
  `<stop offset="100%" stop-color="#5f5a50"/></linearGradient>` +
  `<linearGradient id="charm-clock-glass" x1="0.1" y1="0" x2="0.6" y2="0.85">` +
  `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>` +
  `<stop offset="52%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
  `</defs>` +
  `<circle class="clock-rim" cx="50" cy="50" r="48"/>` +
  `<circle class="clock-face" cx="50" cy="50" r="45"/>${clockTicks}` +
  `<polygon class="clock-hand clock-hand--hour" data-hand="hour" points="48.4,57 51.6,57 50.85,26 49.15,26"/>` +
  `<polygon class="clock-hand clock-hand--minute" data-hand="minute" points="48.85,58 51.15,58 50.6,12 49.4,12"/>` +
  `<g class="clock-hand clock-hand--second" data-hand="second">` +
  `<rect x="49.75" y="11" width="0.5" height="49"/><circle cx="50" cy="57" r="1.9"/>` +
  `</g>` +
  `<circle class="clock-hub" cx="50" cy="50" r="2.1"/>` +
  `<circle class="clock-glass" cx="50" cy="50" r="45"/>` +
  `</svg>`;

// `size` defaults are optically tuned (see above) so the charms read at one
// visual scale in the gallery: sparse/narrow art (pearl, jacket) runs bigger,
// dense filled shapes (heart, count) run smaller.
export const CHARMS = {
  flower: {
    kind: 'image',
    src: '/assets/images/site/flower.png',
    decoding: 'sync',
    fetchpriority: 'high',
    size: 1.15,
  },
  jacket: { kind: 'image', src: '/assets/images/site/jacket.png', size: 1.35 },
  canister: { kind: 'image', src: '/assets/images/site/film_canister.png', size: 1.1 },
  pearl: { kind: 'image', src: '/assets/images/site/pearl.png', size: 1.5 },
  // Photographic rather than painted, on purpose — the charms aren't meant to
  // agree on an art style. Runs bigger than the rule above: it's a real photo,
  // not art drawn to read as an icon.
  gr3: { kind: 'image', src: '/assets/images/site/ricoh_gr3.png', size: 1.15 },
  heart: { kind: 'svg', markup: heartSvg, size: 0.8 },
  clock: { kind: 'svg', markup: clockSvg, size: 1.4 },
  // `value` prop supplies the real number at each call site; `sample` is the gallery placeholder.
  count: { kind: 'text', sample: 42, size: 0.62 },
} satisfies Record<string, CharmDef>;

export type CharmType = keyof typeof CHARMS;
