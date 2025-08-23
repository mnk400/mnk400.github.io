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

        // Clear any existing content
        albumContainer.innerHTML = '';
        
        // Create two columns for masonry layout
        const leftColumn = document.createElement('div');
        const rightColumn = document.createElement('div');
        leftColumn.className = 'masonry-column';
        rightColumn.className = 'masonry-column';
        
        albumContainer.appendChild(leftColumn);
        albumContainer.appendChild(rightColumn);

        // Track column heights for balanced distribution
        let leftColumnHeight = 0;
        let rightColumnHeight = 0;
        
        response.data.data.forEach((image, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';

            const img = document.createElement('img');
            img.src = image.link;
            img.alt = image.title || 'Gallery Image';
            img.loading = 'lazy';
            
            // Add click handler for lightbox
            imageCard.addEventListener('click', () => {
                showInLightbox(image.link);
            });

            imageCard.appendChild(img);
            
            // Estimate image height based on aspect ratio for better distribution
            const aspectRatio = image.width / image.height;
            const estimatedHeight = 300 / aspectRatio; // Assume 300px width
            
            // Place in the column with less estimated height
            if (leftColumnHeight <= rightColumnHeight) {
                leftColumn.appendChild(imageCard);
                leftColumnHeight += estimatedHeight;
            } else {
                rightColumn.appendChild(imageCard);
                rightColumnHeight += estimatedHeight;
            }
        });
        
        createLightbox();
        
    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error('Error loading album:', error);
        albumContainer.innerHTML = '<p class="error-message">Failed to load images. Please try again later.</p>';
    }
}

// Load album on page load
if (document.readyState === 'complete') {
    loadAlbum();
} else {
    window.addEventListener('load', loadAlbum);
}