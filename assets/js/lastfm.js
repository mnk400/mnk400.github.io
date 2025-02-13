
const username = 'mnk_400';
let currentView = 'albums';
let currentPeriod = '7day';

document.addEventListener('DOMContentLoaded', () => {
    // View toggle event listeners
    document.getElementById('albums-toggle').addEventListener('click', () => switchView('albums'));
    document.getElementById('artists-toggle').addEventListener('click', () => switchView('artists'));

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
    fetchData();
}

function switchPeriod(period) {
    currentPeriod = period;
    updateToggleStates();
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
        grid.style.display = 'grid';

        if (data.error) {
            grid.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const artists = data.topartists.artist;
        grid.innerHTML = artists.map(artist => {
            const imageUrl = artist.image.find(img => img.size === 'large')['#text'] || '/assets/album-placeholder.png';
            return `
                <div class="album-item">
                    <img src="${imageUrl}" alt="${artist.name}">
                    <p>${artist.name}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        grid.innerHTML = `<p>Error fetching artists: ${error.message}</p>`;
    } finally {
        loading.style.display = 'none';
    }
}

function handleViewChange(view) {
    const loading = document.getElementById('loading');
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
    loading.style.display = 'block';
    
    if (view === 'albums') {
        loading.textContent = 'Loading albums...';
        fetchTopAlbums(selectedPeriod);
    } else {
        loading.textContent = 'Loading artists...';
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