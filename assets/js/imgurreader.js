const CLIENT_ID = 'b6bc278a11fc930';
        const ALBUM_HASH = 'Hq3ctL4';

        function getRandomNumber(min, max) {
            return Math.random() * (max - min) + min;
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

                    imageWrapper.appendChild(img);
                    imageCard.appendChild(imageWrapper);
                    albumContainer.appendChild(imageCard);
                    document.createElement('br')
                });
            } catch (error) {
                loadingIndicator.style.display = 'none';
                console.error('Error loading album:', error);
            }
        }

        // Load album on page load
        loadAlbum()