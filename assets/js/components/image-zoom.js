/**
 * Image Zoom Component
 * Handles all [data-zoomable] images with smooth zoom animations.
 *
 * When a zoomable image lives inside an ancestor with [data-gallery],
 * the lightbox also exposes prev/next navigation across its siblings and
 * reads optional data-title / data-meta attributes to render a caption.
 */

(function () {
  const ICON_SVGS = {
    "caret-left": '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/></svg>',
    "caret-right": '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/></svg>',
    "x": '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/></svg>',
  };

  let backdrop = null;
  let clonedImage = null;
  let controlsEl = null;
  let metaLineEl = null;
  let navLineEl = null;
  let closeButton = null;
  let prevButton = null;
  let nextButton = null;
  let counterEl = null;
  let captionEl = null;
  let detailEl = null;
  let metaSepEl = null;

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
    const minVerticalPadding = 30;

    // Match the SCSS:
    // .image-zoom-controls { bottom: --spacing-xl (20px); gap: --spacing-xs (5px) }
    // nav row buttons are 24px; meta caption line-height ≈ 20px.
    // Strip height changes based on whether the meta row is visible — we
    // want the image vertically centered between the viewport top and
    // whichever element is the topmost of the strip (meta line if shown,
    // otherwise the nav row).
    const stripBottomMargin = 20;
    const navHeight = 24;
    const metaHeight = hasMeta ? 20 : 0;
    const stripGap = hasMeta ? 5 : 0;
    const stripHeight = navHeight + stripGap + metaHeight;
    const stripTop = viewportHeight - stripBottomMargin - stripHeight;

    const maxWidth = viewportWidth - horizontalPadding * 2;
    const maxHeight = stripTop - minVerticalPadding * 2;

    const imageAspect = naturalWidth / naturalHeight;
    const viewportAspect = maxWidth / maxHeight;

    let finalWidth, finalHeight;
    if (imageAspect > viewportAspect) {
      finalWidth = maxWidth;
      finalHeight = finalWidth / imageAspect;
    } else {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imageAspect;
    }

    return {
      width: finalWidth,
      height: finalHeight,
      left: (viewportWidth - finalWidth) / 2,
      // Center vertically between top of viewport and top of the strip.
      top: (stripTop - finalHeight) / 2,
    };
  }

  async function createClone(img, initialRect) {
    const clone = document.createElement("img");
    // Start with the thumb that's already painted on the page — the open
    // animation can run instantly instead of waiting on a full-res download.
    // upgradeCloneToFull() swaps in the high-res source once it's ready.
    clone.src = img.src;
    clone.alt = img.alt;
    clone.className = "image-zoom-clone";
    clone.style.position = "fixed";
    clone.style.transition = "none";
    if (initialRect) setRect(clone, initialRect);
    document.body.appendChild(clone);
    try {
      await clone.decode();
    } catch (e) {}
    return clone;
  }

  function upgradeCloneToFull(clone, img) {
    const fullSrc = img.dataset.fullSrc;
    if (!fullSrc || fullSrc === clone.src) return;
    const loader = new Image();
    loader.src = fullSrc;
    loader
      .decode()
      .then(() => {
        if (clone.isConnected) clone.src = fullSrc;
      })
      .catch(() => {});
  }

  function computeTargetForImg(img, clone, fallbackRect) {
    // Aspect ratio comes from the thumb (clone) — it matches the full image
    // since both are renderings of the same source. We deliberately do not
    // cap by naturalWidth/Height: the thumb is lower-res than the eventual
    // full image, so capping here would zoom too small. The thumb gets
    // stretched briefly until the full-res swap lands.
    const aspectW =
      clone.naturalWidth || img.naturalWidth || fallbackRect.width;
    const aspectH =
      clone.naturalHeight || img.naturalHeight || fallbackRect.height;
    const { title, detail } = metaFor(img);
    return calculateZoomedDimensions(aspectW, aspectH, !!(title || detail));
  }

  function makeButton(className, icon, ariaLabel, onClick, parent = document.body) {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = ICON_SVGS[icon];
    btn.setAttribute("aria-label", ariaLabel);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    parent.appendChild(btn);
    return btn;
  }

  function makeSeparator(extraClass) {
    const sep = document.createElement("span");
    sep.className = "image-zoom-sep" + (extraClass ? " " + extraClass : "");
    sep.textContent = "·";
    sep.setAttribute("aria-hidden", "true");
    return sep;
  }

  function handleBackdropClick(e) {
    if (e.target !== backdrop) return;
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(closeZoom);
  }

  function createOverlay(multi) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "image-zoom-backdrop";
    backdrop.setAttribute("aria-label", "Close zoomed image");
    backdrop.addEventListener("click", handleBackdropClick);
    document.body.appendChild(backdrop);

    // Two-line cluster.
    //   metaLineEl: caption · camera detail   (varies per image)
    //   navLineEl:  ← → · 1/23 · ✕            (constant per gallery)
    controlsEl = document.createElement("div");
    controlsEl.className = "image-zoom-controls";
    document.body.appendChild(controlsEl);

    metaLineEl = document.createElement("div");
    metaLineEl.className = "image-zoom-meta";
    controlsEl.appendChild(metaLineEl);

    captionEl = document.createElement("span");
    captionEl.className = "image-zoom-caption";
    metaLineEl.appendChild(captionEl);

    metaSepEl = makeSeparator("image-zoom-sep--meta");
    metaLineEl.appendChild(metaSepEl);

    detailEl = document.createElement("span");
    detailEl.className = "image-zoom-detail";
    metaLineEl.appendChild(detailEl);

    navLineEl = document.createElement("div");
    navLineEl.className = "image-zoom-nav";
    controlsEl.appendChild(navLineEl);

    if (multi) {
      prevButton = makeButton(
        "image-zoom-control-button image-zoom-nav-button image-zoom-nav-button--prev",
        "caret-left",
        "Previous image",
        () => navigate(-1),
        navLineEl,
      );
      nextButton = makeButton(
        "image-zoom-control-button image-zoom-nav-button image-zoom-nav-button--next",
        "caret-right",
        "Next image",
        () => navigate(1),
        navLineEl,
      );

      navLineEl.appendChild(makeSeparator("image-zoom-sep--counter"));

      counterEl = document.createElement("span");
      counterEl.className = "image-zoom-counter";
      navLineEl.appendChild(counterEl);

      navLineEl.appendChild(makeSeparator("image-zoom-sep--close"));
    }

    closeButton = makeButton(
      "image-zoom-control-button image-zoom-close",
      "x",
      "Close zoomed image",
      closeZoom,
      navLineEl,
    );
  }

  function updateMeta() {
    if (!originalImage) return;
    const { title, detail } = metaFor(originalImage);

    if (captionEl) {
      captionEl.textContent = title || "";
      captionEl.style.display = title ? "" : "none";
    }
    if (detailEl) {
      detailEl.textContent = detail || "";
      detailEl.style.display = detail ? "" : "none";
    }
    // Separator only when both halves are present.
    if (metaSepEl) {
      metaSepEl.style.display = title && detail ? "" : "none";
    }
    // Hide the whole row when there is nothing to show — keeps the
    // controls visually balanced with no empty gap above them.
    if (metaLineEl) {
      metaLineEl.classList.toggle("is-empty", !title && !detail);
    }
  }

  function updateNavState() {
    if (counterEl) {
      counterEl.textContent = `${currentIndex + 1} / ${siblings.length}`;
      // Pin width to the widest state ("N / N" with the largest index) so
      // the surrounding arrows / close button don't shift as the index
      // grows from a 1-digit to a 2-digit number.
      const digits = String(siblings.length).length;
      counterEl.style.minWidth = `${digits * 2 + 3}ch`;
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
    upgradeCloneToFull(clonedImage, img);

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

      setRect(clonedImage, target);
      clonedImage.classList.add("zoomed");

      setTimeout(() => {
        isAnimating = false;
      }, 300);
    });

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    // Block page-level scrolling while zoom is open. On mobile Safari any
    // vertical drag on the body toggles the address bar, which makes the
    // intended horizontal swipe-nav feel jumpy. Swipe nav reads only
    // touchstart/touchend coords, so suppressing touchmove default is safe.
    document.addEventListener("touchmove", preventTouchMove, { passive: false });
  }

  async function navigate(direction) {
    if (isAnimating || !clonedImage) return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= siblings.length) return;

    isAnimating = true;

    // Fade out the changing text (caption / detail / counter) immediately,
    // swap content while it's invisible, fade back in. The fade timing is
    // shorter than the image slide so the text settles slightly before
    // the image finishes its transition.
    if (metaLineEl) metaLineEl.classList.add("is-fading");

    if (originalImage) originalImage.style.visibility = "";
    const newImg = siblings[newIndex];
    currentIndex = newIndex;
    originalImage = newImg;

    const originalRect = newImg.getBoundingClientRect();
    const newClone = await createClone(newImg);
    const target = computeTargetForImg(newImg, newClone, originalRect);
    upgradeCloneToFull(newClone, newImg);

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

    requestAnimationFrame(() => {
      newClone.style.transform = "translateX(0)";
      oldClone.style.transform = `translateX(${-enterFrom}px)`;
    });

    // Swap text content at the midpoint of the fade, then fade back in.
    setTimeout(() => {
      updateNavState();
      updateMeta();
      if (metaLineEl) metaLineEl.classList.remove("is-fading");
    }, 150);

    setTimeout(() => {
      oldClone.remove();
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

    setTimeout(() => {
      originalImage.style.visibility = "";

      // Removing controlsEl removes all the inline children (caption,
      // separators, counter, detail) along with it; just null the refs.
      [clonedImage, backdrop, controlsEl].filter(Boolean).forEach((el) =>
        el.remove(),
      );
      clonedImage = backdrop = controlsEl = closeButton = null;
      metaLineEl = navLineEl = null;
      prevButton = nextButton = counterEl = null;
      captionEl = detailEl = metaSepEl = null;

      originalImage = null;
      siblings = [];
      currentIndex = 0;
      isAnimating = false;

      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchmove", preventTouchMove);
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

  function preventTouchMove(e) {
    e.preventDefault();
  }

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
