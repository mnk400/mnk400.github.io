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
      const timeLocationEl = document.getElementById(
        "music-widget-time-location",
      );

      const isNowPlaying = track["@attr"]?.nowplaying === "true";
      const imageUrl =
        track.image.find((img) => img.size === "large")["#text"] ||
        "/assets/album-placeholder.png";

      artEl.src = imageUrl;
      trackEl.textContent = track.name;
      artistEl.textContent = track.artist["#text"];

      if (labelEl) {
        labelEl.innerHTML = isNowPlaying
          ? "Now playing"
          : "Last listened to" + ` …`;
      }

      // Update time and location
      if (timeLocationEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/Los_Angeles",
        });
        timeLocationEl.textContent = `${timeString} - Seattle, WA`;
      }

      widget.classList.add("loaded");
    }
  } catch (error) {
    console.error("Error fetching music widget:", error);
  }
}

function switchView(view) {
  currentView = view;
  updateToggleStates();
  const grid = document.getElementById("album-grid");
  const loading = document.getElementById("loading");
  grid.style.display = "none";
  loading.style.display = "block";
  fetchData();
}

function switchPeriod(period) {
  currentPeriod = period;
  updateToggleStates();
  const grid = document.getElementById("album-grid");
  const loading = document.getElementById("loading");
  grid.style.display = "none";
  loading.style.display = "block";
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

async function fetchTopAlbums() {
  const loading = document.getElementById("loading");
  const grid = document.getElementById("album-grid");

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=${currentPeriod}&api_key=${apiKey}&format=json&limit=9`,
    );
    const data = await response.json();
    grid.style.display = "grid";

    if (data.error) {
      grid.innerHTML = `<p>Error: ${data.message}</p>`;
      return;
    }

    const albums = data.topalbums.album;
    grid.innerHTML = albums
      .map((album) => {
        const imageUrl =
          album.image.find((img) => img.size === "large")["#text"] ||
          "/assets/album-placeholder.png";
        return `
                <div class="album-item">
                    <div class="album-image-container">
                        <img src="${imageUrl}" alt="${album.name}" class="img-curved-edges">
                        <div class="music-album-info-overlay">
                        <center>
                            <p class="music-album-title">${album.name}</p>
                            <p class="music-artist-name-overlay">${album.artist.name}</p>
                        </center>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");

    // Add event listeners for tap support on mobile
    const albumItems = grid.querySelectorAll(".album-image-container");
    albumItems.forEach((item) => {
      item.addEventListener("click", function () {
        // Close any other open overlays first
        albumItems.forEach((otherItem) => {
          if (otherItem !== this) {
            otherItem
              .querySelector(".music-album-info-overlay")
              .classList.remove("show-overlay");
          }
        });
        // Toggle current overlay
        const overlay = this.querySelector(".music-album-info-overlay");
        overlay.classList.toggle("show-overlay");
      });
    });
  } catch (error) {
    grid.innerHTML = `<p>Error fetching albums: ${error.message}</p>`;
  } finally {
    loading.style.display = "none";
  }
}

async function fetchTopArtists() {
  const loading = document.getElementById("loading");
  const grid = document.getElementById("album-grid");

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=${currentPeriod}&api_key=${apiKey}&format=json&limit=9`,
    );
    const data = await response.json();
    grid.style.display = "block";

    if (data.error) {
      grid.innerHTML = `<p>Error: ${data.message}</p>`;
      return;
    }

    const artists = data.topartists.artist;
    grid.innerHTML = `<div class="artist-list">${artists
      .map(
        (artist, index) => `
                <div class="music-artist-item">
                    <p class="music-artist-name">${index + 1}. ${artist.name}</p>
                </div>
            `,
      )
      .join("")}</div>`;
  } catch (error) {
    grid.innerHTML = `<p>Error fetching artists: ${error.message}</p>`;
  } finally {
    loading.style.display = "none";
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
