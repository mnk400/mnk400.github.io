/**
 * Image Zoom Component
 * Handles all [data-zoomable] images with smooth zoom animations
 */

(function () {
  let backdrop = null;
  let clonedImage = null;
  let closeButton = null;
  let originalImage = null;
  let originalRect = null;
  let isAnimating = false;

  function calculateZoomedDimensions(naturalWidth, naturalHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 40;

    const maxWidth = viewportWidth - padding * 2;
    const maxHeight = viewportHeight - padding * 2;

    const imageAspect = naturalWidth / naturalHeight;
    const viewportAspect = maxWidth / maxHeight;

    let finalWidth, finalHeight;

    if (imageAspect > viewportAspect) {
      // Image is wider than viewport - constrain by width
      finalWidth = Math.min(maxWidth, naturalWidth);
      finalHeight = finalWidth / imageAspect;
    } else {
      // Image is taller than viewport - constrain by height
      finalHeight = Math.min(maxHeight, naturalHeight);
      finalWidth = finalHeight * imageAspect;
    }

    // Center position
    const left = (viewportWidth - finalWidth) / 2;
    const top = (viewportHeight - finalHeight) / 2;

    return { width: finalWidth, height: finalHeight, left, top };
  }

  function createBackdrop() {
    backdrop = document.createElement("div");
    backdrop.className = "image-zoom-backdrop";
    backdrop.addEventListener("click", closeZoom);
    document.body.appendChild(backdrop);
  }

  function createCloseButton() {
    closeButton = document.createElement("button");
    closeButton.className = "image-zoom-close";
    closeButton.innerHTML = '<i class="ph-bold ph-x"></i>';
    closeButton.setAttribute("aria-label", "Close zoomed image");
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      closeZoom();
    });
    document.body.appendChild(closeButton);
  }

  async function openZoom(img) {
    if (isAnimating) return;
    isAnimating = true;
    originalImage = img;

    // Get the original image's position and dimensions
    originalRect = img.getBoundingClientRect();

    // Create backdrop
    createBackdrop();

    // Create close button
    createCloseButton();

    // Clone the image — use full-res source if available
    clonedImage = document.createElement("img");
    clonedImage.src = img.dataset.fullSrc || img.src;
    clonedImage.alt = img.alt;
    clonedImage.className = "image-zoom-clone";

    // Disable transitions initially to prevent animation from wrong position
    clonedImage.style.transition = "none";

    // Position clone exactly over original (fixed position for viewport-relative)
    clonedImage.style.position = "fixed";
    clonedImage.style.top = originalRect.top + "px";
    clonedImage.style.left = originalRect.left + "px";
    clonedImage.style.width = originalRect.width + "px";
    clonedImage.style.height = originalRect.height + "px";

    document.body.appendChild(clonedImage);

    // Wait for full-res image to be fully decoded before animating
    try {
      await clonedImage.decode();
    } catch (e) {
      // decode() may fail for some images, continue anyway
    }

    // Calculate target dimensions based on the full-res image's natural size
    const naturalWidth = clonedImage.naturalWidth || img.naturalWidth || originalRect.width;
    const naturalHeight = clonedImage.naturalHeight || img.naturalHeight || originalRect.height;
    const target = calculateZoomedDimensions(naturalWidth, naturalHeight);

    // Force reflow to ensure initial position is applied
    clonedImage.offsetHeight;

    // Re-enable transitions
    clonedImage.style.transition = "";

    // Wait for clone to be painted before hiding original (fixes Safari flash)
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Hide original image (preserve space)
    originalImage.style.visibility = "hidden";

    // Animate to zoomed state
    requestAnimationFrame(() => {
      backdrop.classList.add("active");
      closeButton.classList.add("active");

      clonedImage.style.top = target.top + "px";
      clonedImage.style.left = target.left + "px";
      clonedImage.style.width = target.width + "px";
      clonedImage.style.height = target.height + "px";
      clonedImage.classList.add("zoomed");

      setTimeout(() => {
        isAnimating = false;
      }, 250);
    });

    // Add escape key listener
    document.addEventListener("keydown", handleKeyDown);
  }

  function closeZoom() {
    if (isAnimating || !clonedImage) return;
    isAnimating = true;

    // Get current position of original (may have changed due to scroll)
    const currentRect = originalImage.getBoundingClientRect();

    // Animate back to original position
    clonedImage.style.top = currentRect.top + "px";
    clonedImage.style.left = currentRect.left + "px";
    clonedImage.style.width = currentRect.width + "px";
    clonedImage.style.height = currentRect.height + "px";
    clonedImage.classList.remove("zoomed");
    backdrop.classList.remove("active");
    closeButton.classList.remove("active");

    // Wait for animation to complete
    setTimeout(() => {
      // Show original image again
      if (originalImage) {
        originalImage.style.visibility = "";
      }

      // Remove elements
      if (clonedImage) {
        clonedImage.remove();
        clonedImage = null;
      }
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
      if (closeButton) {
        closeButton.remove();
        closeButton = null;
      }

      originalImage = null;
      originalRect = null;
      isAnimating = false;

      // Remove escape key listener
      document.removeEventListener("keydown", handleKeyDown);
    }, 250);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeZoom();
    }
  }

  function handleImageClick(e) {
    const img = e.target.closest("[data-zoomable]");
    if (img && img.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      openZoom(img);
    }
  }

  // Use event delegation for all zoomable images
  function init() {
    document.addEventListener("click", handleImageClick);
  }

  // Expose for external use
  window.ImageZoom = {
    init: init,
    open: openZoom,
    close: closeZoom,
  };

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
