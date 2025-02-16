
const username = 'mnk_400';
let currentView = 'albums';
let currentPeriod = '7day';
let nowPlayingInterval;

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
}

async function fetchNowPlaying() {
    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=1`
        );
        const data = await response.json();
        const track = data.recenttracks.track[0];
        const nowPlayingSection = document.getElementById('now-playing');

        if (track) {
            const isNowPlaying = track['@attr']?.nowplaying === 'true';
            const imageUrl = track.image.find(img => img.size === 'large')['#text'] || '/assets/album-placeholder.png';
            const timestamp = parseInt(track.date?.uts * 1000) || Date.now();
            const timeAgo = isNowPlaying ? '' : formatTimeAgo(timestamp);

            nowPlayingSection.innerHTML = `
                <div class="now-playing-container">
                    <img src="${imageUrl}" alt="${track.name}" class="now-playing-image">
                    <div class="now-playing-info">
                        <span class="playing-or-no">${isNowPlaying ? 'Now Playing' : 'Last Played'}</span> 
                        ${timeAgo ? `<span class="description"> - ${timeAgo}</span>` : ''}<br/><br/>
                        <span class="track-title"><b>${track.name}</b></span><br/>
                        <span class="artist-name"><i>${track.artist['#text']}</i></span><br/>
                        <span class="album-name">${track.album['#text']}</span><br/>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching now playing:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // View toggle event listeners
    document.getElementById('albums-toggle').addEventListener('click', () => switchView('albums'));
    document.getElementById('artists-toggle').addEventListener('click', () => switchView('artists'));

    // Initial now playing fetch and interval setup
    fetchNowPlaying();
    nowPlayingInterval = setInterval(fetchNowPlaying, 30000); // Update every 30 seconds

    // Period toggle event listeners
    const periodOptions = document.querySelectorAll('.period-option');
    periodOptions.forEach(option => {
        option.addEventListener('click', () => switchPeriod(option.id));
    });

    // Initial load
    fetchData();
});

function switchView(view) {
    currentView = view;
    updateToggleStates();
    const grid = document.getElementById('album-grid');
    const loading = document.getElementById('loading');
    grid.style.display = 'none';
    loading.style.display = 'block';
    fetchData();
}

function switchPeriod(period) {
    currentPeriod = period;
    updateToggleStates();
    const grid = document.getElementById('album-grid');
    const loading = document.getElementById('loading');
    grid.style.display = 'none';
    loading.style.display = 'block';
    fetchData();
}

function updateToggleStates() {
    // Update view toggle states
    document.querySelectorAll('.view-option').forEach(option => {
        option.classList.remove('active');
        if (option.id === `${currentView}-toggle`) {
            option.classList.add('active');
        }
    });

    // Update period toggle states
    document.querySelectorAll('.period-option').forEach(option => {
        option.classList.remove('active');
        if (option.id === currentPeriod) {
            option.classList.add('active');
        }
    });
}

function fetchData() {
    if (currentView === 'albums') {
        fetchTopAlbums();
    } else {
        fetchTopArtists();
    }
}

async function fetchTopAlbums() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('album-grid');

    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=${currentPeriod}&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=9`
        );
        const data = await response.json();
        grid.style.display = 'grid';

        if (data.error) {
            grid.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const albums = data.topalbums.album;
        grid.innerHTML = albums.map(album => {
            const imageUrl = album.image.find(img => img.size === 'large')['#text'] || '/assets/album-placeholder.png';
            return `
                <div class="album-item">
                    <img src="${imageUrl}" alt="${album.name}">
                    <p>${album.name} - ${album.artist.name}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        grid.innerHTML = `<p>Error fetching albums: ${error.message}</p>`;
    } finally {
        loading.style.display = 'none';
    }
}

async function fetchTopArtists() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('album-grid');

    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=${currentPeriod}&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=9`
        );
        const data = await response.json();
        grid.style.display = 'block';

        if (data.error) {
            grid.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const artists = data.topartists.artist;
        grid.innerHTML = `<div class="artist-list">${
            artists.map((artist, index) => `
                <div class="artist-item">
                    <p class="artist-name">${index + 1}. ${artist.name}</p>
                </div>
            `).join('')
        }</div>`;
    } catch (error) {
        grid.innerHTML = `<p>Error fetching artists: ${error.message}</p>`;
    } finally {
        loading.style.display = 'none';
    }
}

function handleViewChange(view) {
    const grid = document.getElementById('album-grid');
    const albumsToggle = document.getElementById('albums-toggle');
    const artistsToggle = document.getElementById('artists-toggle');
    const periodSelect = document.getElementById('period-select');
    const selectedPeriod = periodSelect.value;

    // Update active states
    if (view === 'albums') {
        albumsToggle.classList.add('active');
        artistsToggle.classList.remove('active');
    } else {
        albumsToggle.classList.remove('active');
        artistsToggle.classList.add('active');
    }

    grid.style.display = 'none';
    
    if (view === 'albums') {
        fetchTopAlbums(selectedPeriod);
    } else {
        fetchTopArtists(selectedPeriod);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const albumsToggle = document.getElementById('albums-toggle');
    const artistsToggle = document.getElementById('artists-toggle');
    const periodSelect = document.getElementById('period-select');

    albumsToggle.addEventListener('click', () => handleViewChange('albums'));
    artistsToggle.addEventListener('click', () => handleViewChange('artists'));
    periodSelect.addEventListener('change', () => {
        const currentView = document.getElementById('albums-toggle').classList.contains('active') ? 'albums' : 'artists';
        handleViewChange(currentView);
    });

    fetchTopAlbums(); // Load albums by default
});