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
  artist: { name: string };
  image: LastfmImage[];
  playcount: string;
}
interface LastfmArtist {
  name: string;
  playcount: string;
}
interface GridItem {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  playcount: string;
}

function imageOf(images: LastfmImage[]): string {
  return images.find((img) => img.size === 'large')?.['#text'] || PLACEHOLDER;
}

async function fetchRecentTrack(): Promise<LastfmTrack | undefined> {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=1`,
  );
  const data = await response.json();
  return data.recenttracks?.track?.[0];
}

export async function initMusicWidget() {
  const widget = document.getElementById('music-widget');
  if (!widget) return;

  wireArtCharm(widget);

  try {
    const track = await fetchRecentTrack();
    if (!track) return;

    const artEl = document.getElementById('music-widget-art') as HTMLImageElement | null;
    const trackEl = document.getElementById('music-widget-track');
    const artistEl = document.getElementById('music-widget-artist');
    const labelEl = document.getElementById('music-widget-label');
    const timeEl = document.getElementById('music-widget-time');

    const isNowPlaying = track['@attr']?.nowplaying === 'true';

    if (artEl) artEl.src = imageOf(track.image);
    if (trackEl) trackEl.textContent = track.name;
    if (artistEl) artistEl.textContent = track.artist['#text'];

    if (labelEl) {
      labelEl.textContent = isNowPlaying ? 'Now playing …' : 'Last listened to …';
    }

    if (timeEl) {
      const timeWrapper = timeEl.closest('.music-widget-time-wrapper');
      if (isNowPlaying) {
        timeEl.textContent = '';
      } else if (track.date?.uts) {
        const playedAt = new Date(parseInt(track.date.uts) * 1000);
        const diffMs = Date.now() - playedAt.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);

        if (diffMins < 1) {
          timeEl.textContent = 'just now';
        } else if (diffMins < 60) {
          timeEl.textContent = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else {
          timeEl.textContent = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        }
      }
      if (timeWrapper) timeWrapper.classList.add('loaded');
    }

    const infoEl = document.querySelector('.music-widget-info');
    if (infoEl) infoEl.classList.add('loaded');

    if (artEl) {
      const reveal = () => artEl.classList.add('loaded');
      if (artEl.complete) {
        reveal();
      } else {
        artEl.addEventListener('load', reveal, { once: true });
        artEl.addEventListener('error', reveal, { once: true });
      }
    }
  } catch (error) {
    console.error('Error fetching music widget:', error);
  }
}

// The album art in the widget doubles as a hidden charm. Hover-grow is pure CSS
// (see _music.scss); the click pulse needs JS to retrigger the one-shot each
// time. Clicking the art plays the pulse instead of following the widget link.
function wireArtCharm(widget: HTMLElement) {
  const wrapper = widget.querySelector<HTMLElement>('.music-widget-art-wrapper');
  const art = widget.querySelector<HTMLElement>('.music-widget-art');
  if (!wrapper || !art || wrapper.dataset.charmInit === 'true') return;
  wrapper.dataset.charmInit = 'true';

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

export function initMusicPage() {
  const viewToggle = document.getElementById('view-toggle');
  const periodToggle = document.getElementById('period-toggle');
  const grid = document.getElementById('album-grid');
  if (!viewToggle || !periodToggle || !grid) return;

  let currentView = 'albums';
  let currentPeriod = '7day';

  function setSwitchActive(container: HTMLElement, value: string) {
    container.querySelectorAll<HTMLElement>('.switch-option').forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.value === value);
    });
  }

  function fadeOutGrid(): Promise<void> {
    return new Promise((resolve) => {
      if (!grid || grid.children.length === 0) {
        resolve();
        return;
      }
      grid.classList.add('grid-fade-out');
      grid.addEventListener('transitionend', () => resolve(), { once: true });
      setTimeout(resolve, 350);
    });
  }

  function renderGrid(items: GridItem[]) {
    const template = document.getElementById('music-card-template') as HTMLTemplateElement | null;
    if (!template || !grid) return;

    grid.innerHTML = '';
    grid.classList.remove('grid-fade-out');
    grid.style.display = 'grid';

    items.forEach((item) => {
      const card = template.content.cloneNode(true) as DocumentFragment;
      const img = card.querySelector('[data-field="image"]') as HTMLImageElement;
      const title = card.querySelector('[data-field="title"]') as HTMLElement;
      const subtitle = card.querySelector('[data-field="subtitle"]') as HTMLElement;
      const playcount = card.querySelector('[data-field="playcount"]') as HTMLElement;

      img.src = item.imageUrl;
      img.alt = item.title;
      title.textContent = item.title;
      if (item.subtitle) {
        subtitle.textContent = item.subtitle;
      } else {
        subtitle.remove();
      }
      playcount.textContent = `${item.playcount} Plays`;

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
        grid!.innerHTML = `<p>Error: ${data.message}</p>`;
        return;
      }

      const items: GridItem[] = data.topalbums.album.map((album: LastfmAlbum) => ({
        imageUrl: imageOf(album.image),
        title: album.name,
        subtitle: album.artist.name,
        playcount: album.playcount,
      }));
      renderGrid(items);
    } catch (error) {
      grid!.innerHTML = `<p>Error fetching albums: ${(error as Error).message}</p>`;
    }
  }

  async function fetchTopArtists() {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${USERNAME}&period=${currentPeriod}&api_key=${API_KEY}&format=json&limit=9`,
      );
      const data = await response.json();

      if (data.error) {
        grid!.innerHTML = `<p>Error: ${data.message}</p>`;
        return;
      }

      const artists: LastfmArtist[] = data.topartists.artist;
      const imageResults = await Promise.allSettled(
        artists.map((artist) => fetchArtistImage(artist.name)),
      );

      const items: GridItem[] = artists.map((artist, index) => ({
        imageUrl: imageResults[index].status === 'fulfilled'
          ? (imageResults[index] as PromiseFulfilledResult<string>).value
          : PLACEHOLDER,
        title: artist.name,
        subtitle: null,
        playcount: artist.playcount,
      }));
      renderGrid(items);
    } catch (error) {
      grid!.innerHTML = `<p>Error fetching artists: ${(error as Error).message}</p>`;
    }
  }

  function fetchData() {
    if (currentView === 'albums') {
      fetchTopAlbums();
    } else {
      fetchTopArtists();
    }
  }

  viewToggle.addEventListener('change', async (event) => {
    const value = (event as CustomEvent).detail?.value;
    if (!value) return;
    currentView = value;
    setSwitchActive(viewToggle, currentView);
    setSwitchActive(periodToggle, currentPeriod);
    await fadeOutGrid();
    fetchData();
  });

  periodToggle.addEventListener('change', async (event) => {
    const value = (event as CustomEvent).detail?.value;
    if (!value) return;
    currentPeriod = value;
    setSwitchActive(viewToggle, currentView);
    setSwitchActive(periodToggle, currentPeriod);
    await fadeOutGrid();
    fetchData();
  });

  fetchData();
}
