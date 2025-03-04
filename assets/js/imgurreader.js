const CLIENT_ID = 'b6bc278a11fc930';

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
    
    lightbox.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
    
    document.body.appendChild(lightbox);
    return lightbox;
}

function showInLightbox(imageSrc) {
    const lightbox = document.getElementById('lightbox') || createLightbox();
    
    lightbox.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    
    img.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    lightbox.appendChild(img);
    lightbox.style.display = 'block';
}

async function loadAlbum() {
    const albumContainer = document.getElementById('album-container');
    const loadingIndicator = document.getElementById('loading');

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

            // Create wrapper div to control size
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';

            const img = document.createElement('img');
            img.src = image.link;
            img.alt = image.title || 'Gallery Image';
            
            imageCard.addEventListener('click', () => {
                showInLightbox(image.link);
            });

            imageWrapper.appendChild(img);
            imageCard.appendChild(imageWrapper);
            albumContainer.appendChild(imageCard);
        });
        
        createLightbox();
        
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error loading album:', error);
    }
}

// Load album on page load
loadAlbum()