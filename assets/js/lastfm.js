
const username = 'mnk_400';

async function fetchTopAlbums() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('album-grid');

    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=7day&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=9`
        );
        const data = await response.json();
        grid.style.display = 'grid'

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
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=9`
        );
        const data = await response.json();
        grid.style.display = 'block';

        if (data.error) {
            grid.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const artists = data.topartists.artist;
        grid.innerHTML = `<div class="artist-list">${
            artists.map(artist => 
                `<div class="artist-item">
                    <p>${artist.name} (${artist.playcount} plays)</p>
                </div>`
            ).join('')
        }</div>`;
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
        fetchTopAlbums();
    } else {
        loading.textContent = 'Loading artists...';
        fetchTopArtists();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const albumsToggle = document.getElementById('albums-toggle');
    const artistsToggle = document.getElementById('artists-toggle');

    albumsToggle.addEventListener('click', () => handleViewChange('albums'));
    artistsToggle.addEventListener('click', () => handleViewChange('artists'));

    fetchTopAlbums(); // Load albums by default
});