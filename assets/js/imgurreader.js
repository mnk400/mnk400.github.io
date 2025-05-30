const CLIENT_ID = 'b6bc278a11fc930';

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function createLightbox() {
    let lightbox = document.getElementById('lightbox');
    if (lightbox) return lightbox;
  
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
  
    const closeButton = document.createElement('div');
    closeButton.className = 'lightbox-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        lightbox.style.display = 'none';
    });
    
    lightbox.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
    
    lightbox.appendChild(closeButton);
    document.body.appendChild(lightbox);
    return lightbox;
}

function showInLightbox(imageSrc) {
    const lightbox = document.getElementById('lightbox') || createLightbox();
    
    lightbox.innerHTML = '';
    
    // Create close button using FontAwesome
    const closeButton = document.createElement('div');
    closeButton.className = 'lightbox-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        lightbox.style.display = 'none';
    });
    
    const img = document.createElement('img');
    img.src = imageSrc;
    
    img.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    lightbox.appendChild(closeButton);
    lightbox.appendChild(img);
    lightbox.style.display = 'block';
}

async function loadAlbum() {
    const containerID = typeof ALBUM_CONTAINER_ID !== 'undefined' ? ALBUM_CONTAINER_ID : 'album-container';
    const loadingID = typeof LOADING_ID !== 'undefined' ? LOADING_ID : 'loading';

    const albumContainer = document.getElementById(containerID);
    const loadingIndicator = document.getElementById(loadingID);

    if (!albumContainer || !loadingIndicator) {
        console.error('Album container or loading indicator not found');
        return;
    }

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
if (document.readyState === 'complete') {
    loadAlbum();
} else {
    window.addEventListener('load', loadAlbum);
}