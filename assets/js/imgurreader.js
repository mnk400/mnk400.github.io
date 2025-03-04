const CLIENT_ID = 'b6bc278a11fc930';

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function openLightbox(imageSrc) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = imageSrc;
    lightbox.style.display = 'flex';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
}

async function loadAlbum() {
    const albumContainer = document.getElementById('album-container');
    const loadingIndicator = document.getElementById('loading');
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.querySelector('.close-btn');

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    try {
        const response = await axios.get(`https://api.imgur.com/3/album/${ALBUM_HASH}/images`, {
            headers: {
                'Authorization': `Client-ID ${CLIENT_ID}`
            }
        });

        loadingIndicator.style.display = 'none';

        response.data.data.forEach((image) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';

            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';

            const img = document.createElement('img');
            img.src = image.link;
            img.alt = image.title || 'Gallery Image';
            img.addEventListener('click', () => openLightbox(image.link));

            imageWrapper.appendChild(img);
            imageCard.appendChild(imageWrapper);
            albumContainer.appendChild(imageCard);
        });
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error loading album:', error);
    }
}

// Load album on page load
loadAlbum()