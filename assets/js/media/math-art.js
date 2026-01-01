async function loadImages() {
    const api_url = "https://gen-image-api.manik.cc/"
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    try {
        const response = await fetch(api_url + '/api/images');
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        loading.style.display = 'none';
        // Display first 20 images
        const imagesToShow = data.images.slice(0, 20);
        imagesToShow.forEach(imageUrl => {
            const img = document.createElement('img');
            img.src = api_url + "/" + imageUrl;
            img.className = 'gallery-image';
            img.alt = 'Generated Art';
            gallery.appendChild(img);
        });
    } catch (error) {
        console.error('Error loading images from RPi:', error);
        errorMessage.style.display = 'block';

        const BACKUP_ALBUM_HASH = '7JwJMMz';

        if (typeof loadAlbum === 'function') {
            console.log('Attempting to load backup Imgur album...');
            loading.style.display = 'block'; // Show loading again for the backup load
            loadAlbum(BACKUP_ALBUM_HASH, 'gallery', 'loading');
        } else {
            loading.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadImages);