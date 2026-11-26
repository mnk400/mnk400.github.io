import { mount } from './lifecycle.ts';
import { setSwitchValue } from './selection-controls.ts';

const USERNAME = 'mnk_400';
const API_KEY = '15606af7854e910d497469811c1ddbd4';
const PLACEHOLDER = '/assets/images/site/album-placeholder.png';

interface LastfmImage { size: string; '#text': string }
interface LastfmTrack {
  name: string;
  artist: { '#text': string };
  image: LastfmImage[];
  '@attr'?: { nowplaying?: string };
  date?: { uts: string };
}
interface LastfmAlbum {
  name: string;
  url: string;
  artist: { name: string };
  image: LastfmImage[];
  playcount: string;
}
interface LastfmArtist {
  name: string;
  url: string;
  playcount: string;
}
interface GridItem {
  url: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  playcount: string;
}

function imageOf(images: LastfmImage[]): string {
  return images.find((img) => img.size === 'large')?.['#text'] || PLACEHOLDER;
}

// Compact relative time for the widget status meta: "now" / "12m ago" / "3h ago".
function relativeTime(timestampMs: number): string {
  const diffMins = Math.round((Date.now() - timestampMs) / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.round(diffMins / 60)}h ago`;
}

async function fetchRecentTrack(): Promise<LastfmTrack | undefined> {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=1`,
  );
  const data = await response.json();
  return data.recenttracks?.track?.[0];
}

mount('.music-widget', async ({ root, find }) => {
  wireArtCharm(root);

  const track = await fetchRecentTrack();
  if (!track) return;

  const art = find<HTMLImageElement>('.music-widget-art');
  const time = find('.music-widget-status-time');
  const status = find('.music-widget-status');
  const isNowPlaying = track['@attr']?.nowplaying === 'true';

  art.src = imageOf(track.image);
  find('.music-widget-track').textContent = track.name;
  find('.music-widget-artist').textContent = track.artist['#text'];
  find('.music-widget-status-label').textContent = isNowPlaying ? 'now playing' : 'last';

  if (isNowPlaying) time.textContent = '';
  else if (track.date?.uts) time.textContent = relativeTime(parseInt(track.date.uts) * 1000);

  status.classList.toggle('is-live', isNowPlaying);
  status.classList.add('loaded');
  find('.music-widget-info').classList.add('loaded');

  const reveal = () => art.classList.add('loaded');
  if (art.complete) {
    reveal();
  } else {
    art.addEventListener('load', reveal, { once: true });
    art.addEventListener('error', reveal, { once: true });
  }
});

// The album art in the widget doubles as a hidden charm. Hover-grow is pure CSS
// (see _music.scss); the click pulse needs JS to retrigger the one-shot each
// time. Clicking the art plays the pulse instead of following the widget link.
function wireArtCharm(widget: HTMLElement) {
  const wrapper = widget.querySelector<HTMLElement>('.music-widget-art-wrapper');
  const art = widget.querySelector<HTMLElement>('.music-widget-art');
  if (!wrapper || !art) return;

  wrapper.addEventListener('click', (event) => {
    event.preventDefault(); // pulse the charm rather than open the link
    event.stopPropagation();
    art.classList.remove('is-pulsing');
    void art.offsetWidth; // reflow so rapid clicks retrigger the animation
    art.classList.add('is-pulsing');
  });
  art.addEventListener('animationend', (event) => {
    if (event.animationName === 'charm-pulse') art.classList.remove('is-pulsing');
  });
}

function fetchArtistImage(artistName: string): Promise<string> {
  return new Promise((resolve) => {
    const callbackName = `deezer_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(PLACEHOLDER);
    }, 5000);

    (window as unknown as Record<string, (data: { data?: { picture_medium: string }[] }) => void>)[callbackName] = (data) => {
      clearTimeout(timeout);
      cleanup();
      if (data.data && data.data.length > 0) {
        resolve(data.data[0].picture_medium);
      } else {
        resolve(PLACEHOLDER);
      }
    };

    script.src = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1&output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(PLACEHOLDER);
    };
    document.head.appendChild(script);
  });
}

mount('[data-mount="music"]', ({ ref, find }) => {
  const viewToggle = find('#view-toggle');
  const periodToggle = find('#period-toggle');
  const grid = ref('grid');
  const template = ref<HTMLTemplateElement>('card');

  let currentView = 'albums';
  let currentPeriod = '7day';


  function fadeOutGrid(): Promise<void> {
    return new Promise((resolve) => {
      if (grid.children.length === 0) {
        resolve();
        return;
      }
      grid.classList.add('grid-fade-out');
      grid.addEventListener('transitionend', () => resolve(), { once: true });
      setTimeout(resolve, 350);
    });
  }

  function renderGrid(items: GridItem[]) {
    grid.innerHTML = '';
    grid.classList.remove('grid-fade-out');
    grid.style.display = 'grid';

    items.forEach((item) => {
      const card = template.content.cloneNode(true) as DocumentFragment;
      const field = (name: string) => card.querySelector(`[data-field="${name}"]`) as HTMLElement;
      const plays = `${item.playcount} plays`;

      (card.firstElementChild as HTMLAnchorElement).href = item.url;
      (field('image') as HTMLImageElement).src = item.imageUrl;
      field('title').textContent = item.title;
      field('meta').textContent = item.subtitle ? `${item.subtitle} · ${plays}` : plays;

      grid.appendChild(card);
    });

    grid.querySelectorAll<HTMLElement>('.album-item').forEach((card, index) => {
      setTimeout(() => card.classList.add('card-visible'), index * 60);
    });
  }

  async function fetchTopAlbums() {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${USERNAME}&period=${currentPeriod}&api_key=${API_KEY}&format=json&limit=9`,
      );
      const data = await response.json();

      if (data.error) {
        grid.innerHTML = `<p>Error: ${data.message}</p>`;
        return;
      }

      const items: GridItem[] = data.topalbums.album.map((album: LastfmAlbum) => ({
        url: album.url,
        imageUrl: imageOf(album.image),
        title: album.name,
        subtitle: album.artist.name,
        playcount: album.playcount,
      }));
      renderGrid(items);
    } catch (error) {
      grid.innerHTML = `<p>Error fetching albums: ${(error as Error).message}</p>`;
    }
  }

  async function fetchTopArtists() {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${USERNAME}&period=${currentPeriod}&api_key=${API_KEY}&format=json&limit=9`,
      );
      const data = await response.json();

      if (data.error) {
        grid.innerHTML = `<p>Error: ${data.message}</p>`;
        return;
      }

      const artists: LastfmArtist[] = data.topartists.artist;
      const imageResults = await Promise.allSettled(
        artists.map((artist) => fetchArtistImage(artist.name)),
      );

      const items: GridItem[] = artists.map((artist, index) => ({
        url: artist.url,
        imageUrl: imageResults[index].status === 'fulfilled'
          ? (imageResults[index] as PromiseFulfilledResult<string>).value
          : PLACEHOLDER,
        title: artist.name,
        subtitle: null,
        playcount: artist.playcount,
      }));
      renderGrid(items);
    } catch (error) {
      grid.innerHTML = `<p>Error fetching artists: ${(error as Error).message}</p>`;
    }
  }

  function fetchData() {
    if (currentView === 'albums') {
      fetchTopAlbums();
    } else {
      fetchTopArtists();
    }
  }

  viewToggle.addEventListener('selection:change', async (event) => {
    currentView = event.detail.value;
    setSwitchValue(viewToggle, currentView);
    setSwitchValue(periodToggle, currentPeriod);
    await fadeOutGrid();
    fetchData();
  });

  periodToggle.addEventListener('selection:change', async (event) => {
    currentPeriod = event.detail.value;
    setSwitchValue(viewToggle, currentView);
    setSwitchValue(periodToggle, currentPeriod);
    await fadeOutGrid();
    fetchData();
  });

  fetchData();
});
