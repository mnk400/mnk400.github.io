const username = "mnk_400";
const apiKey = "15606af7854e910d497469811c1ddbd4";
let currentView = "albums";
let currentPeriod = "7day";

async function fetchRecentTrack() {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`,
  );
  const data = await response.json();
  return data.recenttracks.track[0];
}

async function fetchMusicWidget() {
  try {
    const track = await fetchRecentTrack();
    const widget = document.getElementById("music-widget");

    if (track && widget) {
      const artEl = document.getElementById("music-widget-art");
      const trackEl = document.getElementById("music-widget-track");
      const artistEl = document.getElementById("music-widget-artist");
      const labelEl = document.getElementById("music-widget-label");
      const timeEl = document.getElementById("music-widget-time");

      const isNowPlaying = track["@attr"]?.nowplaying === "true";
      const imageUrl =
        track.image.find((img) => img.size === "large")["#text"] ||
        "/assets/album-placeholder.png";

      artEl.src = imageUrl;
      trackEl.textContent = track.name;
      artistEl.textContent = track.artist["#text"];

      if (labelEl) {
        labelEl.innerHTML = isNowPlaying
          ? "Now playing …"
          : "Last listened to …";
      }

      // Update playback time from Last.fm data
      if (timeEl) {
        const timeWrapper = timeEl.closest(".music-widget-time-wrapper");
        if (isNowPlaying) {
          timeEl.textContent = "";
        } else if (track.date?.uts) {
          const playedAt = new Date(parseInt(track.date.uts) * 1000);
          const now = new Date();
          const diffMs = now - playedAt;
          const diffMins = Math.round(diffMs / 60000);
          const diffHours = Math.round(diffMs / 3600000);

          if (diffMins < 1) {
            timeEl.textContent = "just now";
          } else if (diffMins < 60) {
            timeEl.textContent = `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
          } else {
            timeEl.textContent = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
          }
        }
        if (timeWrapper) timeWrapper.classList.add("loaded");
      }

      const infoEl = document.querySelector(".music-widget-info");
      if (infoEl) infoEl.classList.add("loaded");

      const revealArt = () => artEl.classList.add("loaded");
      if (artEl.complete) {
        revealArt();
      } else {
        artEl.addEventListener("load", revealArt, { once: true });
        artEl.addEventListener("error", revealArt, { once: true });
      }
    }
  } catch (error) {
    console.error("Error fetching music widget:", error);
  }
}

function fadeOutGrid() {
  return new Promise((resolve) => {
    const grid = document.getElementById("album-grid");
    if (!grid || grid.children.length === 0) {
      resolve();
      return;
    }
    grid.classList.add("grid-fade-out");
    grid.addEventListener("transitionend", () => resolve(), { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(resolve, 350);
  });
}

async function switchView(view) {
  currentView = view;
  updateToggleStates();
  await fadeOutGrid();
  fetchData();
}

async function switchPeriod(period) {
  currentPeriod = period;
  updateToggleStates();
  await fadeOutGrid();
  fetchData();
}

function updateToggleStates() {
  // Update states using the switchManager
  window.switchManager["view-toggle"].setActive(currentView);
  window.switchManager["period-toggle"].setActive(currentPeriod);
}

function fetchData() {
  if (currentView === "albums") {
    fetchTopAlbums();
  } else {
    fetchTopArtists();
  }
}

function renderMusicGrid(grid, items) {
  const template = document.getElementById("music-card-template");
  grid.innerHTML = "";
  grid.classList.remove("grid-fade-out");
  grid.style.display = "grid";

  items.forEach((item) => {
    const card = template.content.cloneNode(true);
    const img = card.querySelector('[data-field="image"]');
    const title = card.querySelector('[data-field="title"]');
    const subtitle = card.querySelector('[data-field="subtitle"]');
    const playcount = card.querySelector('[data-field="playcount"]');

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

  // Staggered fade-in for each card
  const cards = grid.querySelectorAll(".album-item");
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add("card-visible");
    }, index * 60);
  });

  // Add event listeners for tap support on mobile
  const containers = grid.querySelectorAll(".album-image-container");
  containers.forEach((item) => {
    item.addEventListener("click", function () {
      containers.forEach((otherItem) => {
        if (otherItem !== this) {
          otherItem
            .querySelector(".music-card-overlay")
            .classList.remove("show-overlay");
        }
      });
      this.querySelector(".music-card-overlay").classList.toggle("show-overlay");
    });
  });
}

async function fetchTopAlbums() {
  const grid = document.getElementById("album-grid");

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=${currentPeriod}&api_key=${apiKey}&format=json&limit=9`,
    );
    const data = await response.json();

    if (data.error) {
      grid.innerHTML = `<p>Error: ${data.message}</p>`;
      return;
    }

    const items = data.topalbums.album.map((album) => ({
      imageUrl:
        album.image.find((img) => img.size === "large")["#text"] ||
        "/assets/album-placeholder.png",
      title: album.name,
      subtitle: album.artist.name,
      playcount: album.playcount,
    }));

    renderMusicGrid(grid, items);
  } catch (error) {
    grid.innerHTML = `<p>Error fetching albums: ${error.message}</p>`;
  }
}

function fetchArtistImage(artistName) {
  return new Promise((resolve) => {
    const callbackName = `deezer_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve("/assets/album-placeholder.png");
    }, 5000);

    window[callbackName] = (data) => {
      clearTimeout(timeout);
      cleanup();
      if (data.data && data.data.length > 0) {
        resolve(data.data[0].picture_medium);
      } else {
        resolve("/assets/album-placeholder.png");
      }
    };

    script.src = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1&output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve("/assets/album-placeholder.png");
    };
    document.head.appendChild(script);
  });
}

async function fetchTopArtists() {
  const grid = document.getElementById("album-grid");

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=${currentPeriod}&api_key=${apiKey}&format=json&limit=9`,
    );
    const data = await response.json();

    if (data.error) {
      grid.innerHTML = `<p>Error: ${data.message}</p>`;
      return;
    }

    const artists = data.topartists.artist;
    const imageResults = await Promise.allSettled(
      artists.map((artist) => fetchArtistImage(artist.name)),
    );

    const items = artists.map((artist, index) => ({
      imageUrl:
        imageResults[index].status === "fulfilled"
          ? imageResults[index].value
          : "/assets/album-placeholder.png",
      title: artist.name,
      subtitle: null,
      playcount: artist.playcount,
    }));

    renderMusicGrid(grid, items);
  } catch (error) {
    grid.innerHTML = `<p>Error fetching artists: ${error.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the music page (has the toggle switches)
  const isMusicPage = document.getElementById("view-toggle") !== null;

  // Check if we have the widget
  const hasWidget = document.getElementById("music-widget") !== null;

  if (isMusicPage) {
    // Initialize selection switches for music page
    initSwitch("view-toggle", (value) => {
      switchView(value);
    });

    initSwitch("period-toggle", (value) => {
      switchPeriod(value);
    });

    // Initial fetch for music page
    fetchData();
  }

  if (hasWidget) {
    // Fetch for widget
    fetchMusicWidget();
  }
});
