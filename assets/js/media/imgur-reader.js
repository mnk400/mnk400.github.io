const CLIENT_ID = "b6bc278a11fc930";

function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

async function loadAlbum(hashArg, containerIdArg, loadingIdArg) {
  const hash = hashArg || (typeof ALBUM_HASH !== "undefined" ? ALBUM_HASH : null);
  const containerID =
    containerIdArg ||
    (typeof ALBUM_CONTAINER_ID !== "undefined"
      ? ALBUM_CONTAINER_ID
      : "album-container");
  const loadingID =
    loadingIdArg || (typeof LOADING_ID !== "undefined" ? LOADING_ID : "loading");

  if (!hash) {
    console.log("No Imgur album hash provided, skipping auto-load.");
    return;
  }

  const albumContainer = document.getElementById(containerID);
  const loadingIndicator = document.getElementById(loadingID);

  if (!albumContainer) {
    console.error("Album container not found:", containerID);
    return;
  }

  try {
    const response = await axios.get(
      `https://api.imgur.com/3/album/${hash}/images`,
      {
        headers: {
          Authorization: `Client-ID ${CLIENT_ID}`,
        },
      },
    );

    if (loadingIndicator) loadingIndicator.style.display = "none";

    // Clear any existing content
    albumContainer.innerHTML = "";

    // Create two columns for masonry layout
    const leftColumn = document.createElement("div");
    const rightColumn = document.createElement("div");
    leftColumn.className = "masonry-column";
    rightColumn.className = "masonry-column";

    albumContainer.appendChild(leftColumn);
    albumContainer.appendChild(rightColumn);

    // Track column heights for balanced distribution
    let leftColumnHeight = 0;
    let rightColumnHeight = 0;

    response.data.data.forEach((image, index) => {
      const imageCard = document.createElement("div");
      imageCard.className = "image-card";

      const img = document.createElement("img");
      img.src = image.link;
      img.alt = image.title || "Gallery Image";
      img.loading = "lazy";
      img.setAttribute("data-zoomable", "");

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
  } catch (error) {
    if (loadingIndicator) loadingIndicator.style.display = "none";
    console.error("Error loading album:", error);
    albumContainer.innerHTML =
      '<p class="error-message">Failed to load images. Please try again later.</p>';
  }
}

// Load album on page load if global ALBUM_HASH is defined
function init() {
  if (typeof ALBUM_HASH !== "undefined") {
    loadAlbum();
  }
}

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init);
}
