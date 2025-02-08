
const username = 'mnk_400';
async function fetchTopAlbums() {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('album-grid');

    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=7day&api_key=15606af7854e910d497469811c1ddbd4&format=json&limit=9`
        );
        const data = await response.json();

        if (data.error) {
            grid.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const albums = data.topalbums.album;
        grid.innerHTML = albums.map(album => {
            const imageUrl = album.image.find(img => img.size === 'large')['#text'] || 'assets/album-placeholder.png';
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
fetchTopAlbums()