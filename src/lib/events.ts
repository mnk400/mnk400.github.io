// The site's custom DOM events, one entry per event. Registering them on
// HTMLElementEventMap types every listener's `detail`, so consumers write
// `el.addEventListener('selection:change', (e) => e.detail.value)` with no
// casts. Names are `component:change`, never a bare native name like `change`,
// which native inputs inside a component would also bubble up through.

export interface SiteEvents {
  /** SelectionSwitch / SelectionDropdown picked a value. */
  'selection:change': { value: string };
  /** SearchPill's normalized (trimmed, lowercased) query changed. */
  'search:change': { query: string };
  /** ImageUpload loaded a new file into its preview. */
  'image-upload:change': { file: File; image: HTMLImageElement };
}

type SiteEventMap = { [K in keyof SiteEvents]: CustomEvent<SiteEvents[K]> };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementEventMap extends SiteEventMap {}
}

/** Dispatches a site event from `target`. Site events always bubble. */
export function emit<K extends keyof SiteEvents>(target: EventTarget, type: K, detail: SiteEvents[K]): void {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
