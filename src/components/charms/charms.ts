// Charm registry — the intrinsic definition of each charm (what it *is*),
// kept separate from where it's pinned (anchor/x/y/rotate, set per placement).
//
// Charm.astro renders a charm's body from its entry here, so a call site only
// has to say `<Charm type="jacket" ... />`. Adding a charm means one entry
// below plus a matching `.charm--<type>` partial under
// styles/partials/charms/. The gallery at /charms maps over CHARMS, so every
// registered charm shows up there automatically.

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
  heart: { kind: 'svg', markup: heartSvg, size: 0.8 },
  // `value` prop supplies the real number at each call site; `sample` is the gallery placeholder.
  count: { kind: 'text', sample: 42, size: 0.62 },
} satisfies Record<string, CharmDef>;

export type CharmType = keyof typeof CHARMS;
