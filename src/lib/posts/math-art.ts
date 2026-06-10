import { loadImageGallery } from '../image-gallery.ts';

const API_URL = 'https://pi-images.eepy.pink/';
const FALLBACK_MANIFEST = 'https://media.manik.cc/rpi-sample-art/manifest.json';

export async function init() {
  const gallery = document.getElementById('gallery');
  const loading = document.getElementById('loading');
  const errorMessage = document.getElementById('error-message');
  if (!gallery || !loading || !errorMessage) return;
  if (gallery.dataset.mathArtLoaded === 'true') return;
  gallery.dataset.mathArtLoaded = 'true';
  gallery.innerHTML = '';
  errorMessage.style.display = 'none';

  try {
    const response = await fetch(`${API_URL}/api/images`);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    loading.style.display = 'none';
    const imagesToShow: string[] = data.images.slice(0, 20);
    imagesToShow.forEach((imageUrl) => {
      const img = document.createElement('img');
      img.src = `${API_URL}/${imageUrl}`;
      img.className = 'gallery-image';
      img.alt = 'Generated Art';
      gallery.appendChild(img);
    });
  } catch (error) {
    console.error('Error loading images from RPi:', error);
    loading.style.display = 'none';
    errorMessage.style.display = 'block';

    const root = document.getElementById('math-art-gallery');
    if (root) {
      void loadImageGallery(root, {
        source: FALLBACK_MANIFEST,
        galleryName: 'rpi-sample-art',
        showCaptions: false,
      });
    }
  }
}
