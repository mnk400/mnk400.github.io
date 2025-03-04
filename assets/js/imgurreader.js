const CLIENT_ID = 'b6bc278a11fc930';

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = '<span class="close-btn">&times;</span>';
    document.body.appendChild(lightbox);

    const closeBtn = lightbox.querySelector('.close-btn');
    closeBtn.onclick = () => lightbox.style.display = 'none';
    lightbox.onclick = (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    };

    return lightbox;
}

async function loadAlbum() {
    const albumContainer = document.getElementById('album-container');
    const loadingIndicator = document.getElementById('loading');
    const lightbox = createLightbox();

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

            imageWrapper.appendChild(img);
            imageCard.appendChild(imageWrapper);
            albumContainer.appendChild(imageCard);

            imageCard.onclick = () => {
                const lightboxImg = document.createElement('img');
                lightboxImg.src = image.link;
                lightboxImg.alt = image.title || 'Gallery Image';
                
                lightbox.innerHTML = '<span class="close-btn">&times;</span>';
                lightbox.appendChild(lightboxImg);
                lightbox.style.display = 'block';

                const closeBtn = lightbox.querySelector('.close-btn');
                closeBtn.onclick = () => lightbox.style.display = 'none';
            };
        });
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error loading album:', error);
    }
}

// Load album on page load
loadAlbum();