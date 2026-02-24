async function loadImages() {
    const api_url = "https://pi-images.eepy.pink//"
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
        loading.style.display = 'none';
        errorMessage.style.display = 'block';

        // Fall back to R2 archived samples
        if (window.R2Gallery) {
            R2Gallery.loadAlbum(
                document.getElementById('r2-base-url')?.value || 'https://media.manik.cc',
                'rpi-sample-art',
                'gallery',
                null
            );
        }
    }
}

document.addEventListener('DOMContentLoaded', loadImages);
