/**
 * Image Zoom Component
 * Handles all [data-zoomable] images with smooth zoom animations.
 *
 * When a zoomable image lives inside an ancestor with [data-gallery],
 * the lightbox also exposes prev/next navigation across its siblings and
 * reads optional data-title / data-meta attributes to render a caption.
 */

(function () {
  let backdrop = null;
  let clonedImage = null;
  let controlsEl = null;
  let closeButton = null;
  let prevButton = null;
  let nextButton = null;
  let counterEl = null;
  let metaEl = null;

  let originalImage = null;
  let siblings = [];
  let currentIndex = 0;
  let isAnimating = false;

  function isTouchDevice() {
    return window.matchMedia("(hover: none)").matches;
  }

  function setRect(el, rect) {
    el.style.top = rect.top + "px";
    el.style.left = rect.left + "px";
    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function metaFor(img) {
    return {
      title: img.dataset.title || "",
      detail: img.dataset.meta || "",
    };
  }

  function findSiblings(img) {
    const container = img.closest("[data-gallery]");
    if (!container) return [img];
    const items = Array.from(container.querySelectorAll("[data-zoomable]"));
    // If the gallery tagged items with data-gallery-index, honor that
    // ordering — masonry renders column-by-column in DOM, but we want
    // prev/next to follow the authored (manifest) order.
    const hasIndex = items.every(
      (el) => el.dataset.galleryIndex !== undefined,
    );
    if (hasIndex) {
      items.sort(
        (a, b) =>
          Number(a.dataset.galleryIndex) - Number(b.dataset.galleryIndex),
      );
    }
    return items;
  }

  function calculateZoomedDimensions(naturalWidth, naturalHeight, hasMeta) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // On touch devices the controls sit on top of the image, so we don't need
    // to reserve side space for navigation controls.
    const horizontalPadding = isTouchDevice() ? 20 : 60;
    const verticalPadding = 40;
    const controlsReserve = 40;
    const metaReserve = hasMeta ? 36 : 0;

    const topReserve = verticalPadding + metaReserve;
    const bottomReserve = verticalPadding + controlsReserve;
    const maxWidth = viewportWidth - horizontalPadding * 2;
    const maxHeight = viewportHeight - topReserve - bottomReserve;

    const imageAspect = naturalWidth / naturalHeight;
    const viewportAspect = maxWidth / maxHeight;

    let finalWidth, finalHeight;
    if (imageAspect > viewportAspect) {
      finalWidth = Math.min(maxWidth, naturalWidth);
      finalHeight = finalWidth / imageAspect;
    } else {
      finalHeight = Math.min(maxHeight, naturalHeight);
      finalWidth = finalHeight * imageAspect;
    }

    return {
      width: finalWidth,
      height: finalHeight,
      left: (viewportWidth - finalWidth) / 2,
      top: topReserve + (maxHeight - finalHeight) / 2,
    };
  }

  async function createClone(img, initialRect) {
    const clone = document.createElement("img");
    clone.src = img.dataset.fullSrc || img.src;
    clone.alt = img.alt;
    clone.className = "image-zoom-clone";
    clone.style.position = "fixed";
    clone.style.transition = "none";
    if (initialRect) setRect(clone, initialRect);
    document.body.appendChild(clone);
    try {
      await clone.decode();
    } catch (e) {
      // decode() may fail for some images; dimensions fall back to the
      // fallback rect passed into computeTargetForImg.
    }
    return clone;
  }

  function computeTargetForImg(img, clone, fallbackRect) {
    const naturalWidth =
      clone.naturalWidth || img.naturalWidth || fallbackRect.width;
    const naturalHeight =
      clone.naturalHeight || img.naturalHeight || fallbackRect.height;
    const { title, detail } = metaFor(img);
    return calculateZoomedDimensions(
      naturalWidth,
      naturalHeight,
      !!(title || detail),
    );
  }

  function makeButton(className, icon, ariaLabel, onClick, parent = document.body) {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = `<i class="ph-bold ${icon}"></i>`;
    btn.setAttribute("aria-label", ariaLabel);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    parent.appendChild(btn);
    return btn;
  }

  function createOverlay(multi) {
    backdrop = document.createElement("div");
    backdrop.className = "image-zoom-backdrop";
    backdrop.addEventListener("click", closeZoom);
    document.body.appendChild(backdrop);

    controlsEl = document.createElement("div");
    controlsEl.className = "image-zoom-controls";
    document.body.appendChild(controlsEl);

    if (multi) {
      counterEl = document.createElement("span");
      counterEl.className = "image-zoom-counter";
      controlsEl.appendChild(counterEl);

      prevButton = makeButton(
        "image-zoom-control-button image-zoom-nav image-zoom-nav--prev",
        "ph-caret-left",
        "Previous image",
        () => navigate(-1),
        controlsEl,
      );
      nextButton = makeButton(
        "image-zoom-control-button image-zoom-nav image-zoom-nav--next",
        "ph-caret-right",
        "Next image",
        () => navigate(1),
        controlsEl,
      );
    }

    closeButton = makeButton(
      "image-zoom-control-button image-zoom-close",
      "ph-x",
      "Close zoomed image",
      closeZoom,
      controlsEl,
    );

    metaEl = document.createElement("div");
    metaEl.className = "image-zoom-meta";
    document.body.appendChild(metaEl);
  }

  function updateMeta() {
    if (!metaEl || !originalImage) return;
    const { title, detail } = metaFor(originalImage);
    metaEl.innerHTML =
      `<div class="image-zoom-meta-caption">${escapeHtml(title)}</div>` +
      `<div class="image-zoom-meta-detail">${escapeHtml(detail)}</div>`;
    if (title || detail) metaEl.classList.add("active");
    else metaEl.classList.remove("active");
  }

  function positionMeta(target) {
    if (!metaEl) return;
    const gap = 8;
    metaEl.style.left = target.left + "px";
    metaEl.style.top =
      Math.max(gap, target.top - metaEl.offsetHeight - gap) + "px";
    metaEl.style.width = target.width + "px";
    metaEl.style.maxWidth = "";
  }

  function positionControls(target) {
    if (!controlsEl) return;
    controlsEl.style.left = "";
    controlsEl.style.top = "";
  }

  function updateNavState() {
    if (counterEl) {
      counterEl.textContent = `${currentIndex + 1} / ${siblings.length}`;
    }

    if (prevButton) {
      prevButton.disabled = currentIndex <= 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex >= siblings.length - 1;
    }
  }

  async function openZoom(img) {
    if (isAnimating) return;
    isAnimating = true;
    originalImage = img;

    siblings = findSiblings(img);
    currentIndex = Math.max(0, siblings.indexOf(img));

    const originalRect = img.getBoundingClientRect();

    createOverlay(siblings.length > 1);

    clonedImage = await createClone(img, originalRect);
    const target = computeTargetForImg(img, clonedImage, originalRect);

    clonedImage.offsetHeight;
    clonedImage.style.transition = "";

    // Wait for clone to be painted before hiding original (fixes Safari flash)
    await new Promise((resolve) => requestAnimationFrame(resolve));

    originalImage.style.visibility = "hidden";

    requestAnimationFrame(() => {
      backdrop.classList.add("active");
      if (controlsEl) controlsEl.classList.add("active");
      closeButton.classList.add("active");
      if (prevButton) prevButton.classList.add("active");
      if (nextButton) nextButton.classList.add("active");
      updateNavState();
      updateMeta();
      positionMeta(target);
      positionControls(target);

      setRect(clonedImage, target);
      clonedImage.classList.add("zoomed");

      setTimeout(() => {
        isAnimating = false;
      }, 300);
    });

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
  }

  async function navigate(direction) {
    if (isAnimating || !clonedImage) return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= siblings.length) return;

    isAnimating = true;

    if (metaEl) metaEl.classList.remove("active");
    if (originalImage) originalImage.style.visibility = "";
    const newImg = siblings[newIndex];
    currentIndex = newIndex;
    originalImage = newImg;

    const originalRect = newImg.getBoundingClientRect();
    const newClone = await createClone(newImg);
    const target = computeTargetForImg(newImg, newClone, originalRect);

    const slide = window.innerWidth;
    const enterFrom = direction > 0 ? slide : -slide;

    setRect(newClone, target);
    newClone.style.transform = `translateX(${enterFrom}px)`;
    newClone.classList.add("zoomed");

    newClone.offsetHeight;
    newClone.style.transition = "";
    await new Promise((resolve) => requestAnimationFrame(resolve));

    newImg.style.visibility = "hidden";

    const oldClone = clonedImage;
    clonedImage = newClone;

    updateNavState();

    requestAnimationFrame(() => {
      newClone.style.transform = "translateX(0)";
      oldClone.style.transform = `translateX(${-enterFrom}px)`;
    });

    setTimeout(() => {
      oldClone.remove();
      updateMeta();
      positionMeta(target);
      positionControls(target);
      isAnimating = false;
    }, 300);
  }

  function closeZoom() {
    if (isAnimating || !clonedImage) return;
    isAnimating = true;

    // If the user navigated to an image off-screen, scroll its card into
    // view first so the close animation lands somewhere visible.
    originalImage.scrollIntoView({ block: "nearest", behavior: "instant" });

    const currentRect = originalImage.getBoundingClientRect();
    setRect(clonedImage, currentRect);
    clonedImage.classList.remove("zoomed");
    backdrop.classList.remove("active");
    if (controlsEl) controlsEl.classList.remove("active");
    closeButton.classList.remove("active");
    if (prevButton) prevButton.classList.remove("active");
    if (nextButton) nextButton.classList.remove("active");
    if (metaEl) metaEl.classList.remove("active");

    setTimeout(() => {
      originalImage.style.visibility = "";

      [
        clonedImage,
        backdrop,
        controlsEl,
        closeButton,
        prevButton,
        nextButton,
        counterEl,
        metaEl,
      ]
        .filter(Boolean)
        .forEach((el) => el.remove());
      clonedImage = backdrop = controlsEl = closeButton = null;
      prevButton = nextButton = counterEl = metaEl = null;

      originalImage = null;
      siblings = [];
      currentIndex = 0;
      isAnimating = false;

      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    }, 300);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") closeZoom();
    else if (e.key === "ArrowLeft") navigate(-1);
    else if (e.key === "ArrowRight") navigate(1);
  }

  // Swipe handling for touch devices. Threshold is 50px horizontal, and
  // horizontal delta must exceed vertical delta so a scroll-ish gesture
  // doesn't trigger navigation.
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (!e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    // Swipe left → next image, swipe right → previous image.
    navigate(dx < 0 ? 1 : -1);
  }

  function handleImageClick(e) {
    const img = e.target.closest("[data-zoomable]");
    if (img && img.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      openZoom(img);
    }
  }

  function init() {
    document.addEventListener("click", handleImageClick);
  }

  window.ImageZoom = {
    init: init,
    open: openZoom,
    close: closeZoom,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
