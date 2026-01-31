/**
 * UI Components - Handles common UI interactions and components
 * Consolidates expandable sections, image selectors, and header visibility
 */

// Title photo reveal animation (homepage only)
let photoRevealTimeout = null;
let isTransitioning = false;

function triggerPhotoReveal(imagePath = "/assets/images/me.jpg") {
  const container = document.getElementById("titlePhotoContainer");
  if (!container || isTransitioning) return;

  const img = container.querySelector(".title-photo");
  if (!img) return;

  // Clear any existing timeout
  if (photoRevealTimeout) {
    clearTimeout(photoRevealTimeout);
    photoRevealTimeout = null;
  }

  const revealWithImage = () => {
    container.classList.add("revealed");
    photoRevealTimeout = setTimeout(() => {
      container.classList.remove("revealed");
      photoRevealTimeout = null;
    }, 2500);
  };

  const preloadAndReveal = () => {
    // Preload the new image before showing
    const preloader = new Image();
    preloader.onload = () => {
      img.src = imagePath;
      revealWithImage();
      isTransitioning = false;
    };
    preloader.onerror = () => {
      isTransitioning = false;
    };
    preloader.src = imagePath;
  };

  isTransitioning = true;

  // If already revealed, hide first, then preload and reveal new image
  if (container.classList.contains("revealed")) {
    container.classList.remove("revealed");
    // Wait for hide transition to complete
    setTimeout(preloadAndReveal, 300);
  } else {
    preloadAndReveal();
  }
}

// Header visibility toggle functionality
function toggleHeaderVisibility(showFull) {
  const header = document.querySelector("header");

  if (showFull) {
    header.classList.remove("minimal-mode");
  } else {
    header.classList.add("minimal-mode");
  }
}

// Touch hover handler for mobile devices
if ("ontouchstart" in window) {
  const SELECTORS =
    "a, button, .btn, .switch-option, .expandable-toggle, .minimal-header, .minimal-back-button";
  let touchStart = 0;
  let activeTarget = null;

  document.addEventListener(
    "touchstart",
    (e) => {
      activeTarget = e.target.closest(SELECTORS);
      if (activeTarget) {
        touchStart = Date.now();
        activeTarget.classList.add("touch-hover");
      }
    },
    { passive: true },
  );

  const endTouch = () => {
    if (!activeTarget) return;
    const elapsed = Date.now() - touchStart;
    const target = activeTarget;
    activeTarget = null;
    setTimeout(
      () => target.classList.remove("touch-hover"),
      Math.max(0, 150 - elapsed),
    );
  };

  document.addEventListener("touchend", endTouch, { passive: true });
  document.addEventListener("touchcancel", endTouch, { passive: true });
}

// Initialize UI components when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Initialize image selector functionality
  const imageInput = document.getElementById("image-input");
  const imageSelector = document.getElementById("image-selector");

  if (imageSelector && imageInput) {
    imageSelector.addEventListener("click", function () {
      imageInput.click();
    });
  }

  // Initialize expandable sections
  const toggleButtons = document.querySelectorAll(".expandable-toggle");

  toggleButtons.forEach((button) => {
    const content = button.nextElementSibling;

    if (button.getAttribute("aria-expanded") !== "true") {
      content.classList.add("collapsed");
    } else {
      content.classList.remove("collapsed");
    }

    button.addEventListener("click", function () {
      const isExpanded = this.getAttribute("aria-expanded") === "true";
      this.setAttribute("aria-expanded", !isExpanded);

      if (isExpanded) {
        content.style.maxHeight = content.scrollHeight + "px";
        content.offsetHeight;
        content.classList.add("collapsed");
      } else {
        content.classList.remove("collapsed");
        content.style.maxHeight = content.scrollHeight + "px";

        content.addEventListener("transitionend", function handler(e) {
          if (
            e.propertyName === "max-height" &&
            !content.classList.contains("collapsed")
          ) {
            content.style.maxHeight = "";
            content.removeEventListener("transitionend", handler);
          }
        });
      }
    });
  });

  // Initialize copy-to-clipboard buttons
  // Usage: <button data-copy="text to copy" data-copy-feedback="Copied!">Original content</button>
  const copyButtons = document.querySelectorAll("[data-copy]");

  copyButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const textToCopy = this.dataset.copy;
      const feedbackText = this.dataset.copyFeedback || "Copied!";
      const originalContent = this.innerHTML;

      navigator.clipboard.writeText(textToCopy).then(() => {
        this.innerHTML = `<i class="ph-bold ph-check"></i> ${feedbackText}`;
        setTimeout(() => {
          this.innerHTML = originalContent;
        }, 1500);
      });
    });
  });
});
