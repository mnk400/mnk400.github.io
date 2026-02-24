/**
 * R2 Gallery Reader
 * Fetches album manifest from Cloudflare R2 and renders a masonry gallery.
 * Replaces imgur-reader.js.
 */

(function () {
  async function loadAlbum(baseUrl, album, containerId, loadingId) {
    const container = document.getElementById(containerId);
    const loading = document.getElementById(loadingId);

    if (!container) {
      console.error("Gallery container not found:", containerId);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/${album}/manifest.json`);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const manifest = await res.json();

      if (loading) loading.style.display = "none";
      container.innerHTML = "";

      const leftCol = document.createElement("div");
      const rightCol = document.createElement("div");
      leftCol.className = "masonry-column";
      rightCol.className = "masonry-column";
      container.appendChild(leftCol);
      container.appendChild(rightCol);

      let leftHeight = 0;
      let rightHeight = 0;

      manifest.images.forEach((image) => {
        const card = document.createElement("div");
        card.className = "image-card";

        const img = document.createElement("img");
        img.src = `${baseUrl}/${image.thumb}`;
        img.alt = image.title || "Gallery Image";
        img.loading = "lazy";
        img.setAttribute("data-zoomable", "");
        img.setAttribute("data-full-src", `${baseUrl}/${image.full}`);

        card.appendChild(img);

        const aspectRatio =
          image.width && image.height ? image.width / image.height : 1;
        const estimatedHeight = 300 / aspectRatio;

        if (leftHeight <= rightHeight) {
          leftCol.appendChild(card);
          leftHeight += estimatedHeight;
        } else {
          rightCol.appendChild(card);
          rightHeight += estimatedHeight;
        }
      });
    } catch (error) {
      if (loading) loading.style.display = "none";
      console.error("Error loading album:", error);
      container.innerHTML =
        '<p class="error-message">Failed to load images. Please try again later.</p>';
    }
  }

  window.R2Gallery = { loadAlbum: loadAlbum };
})();
