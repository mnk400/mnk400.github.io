/**
 * UI Components - Handles common UI interactions and components
 * Consolidates expandable sections, image selectors, and header visibility
 */

window.switchManager = window.switchManager || {};
window.dropdownManager = window.dropdownManager || {};
window.searchManager = window.searchManager || {};
window.imageUploadManager = window.imageUploadManager || {};

const ICON_SVGS = {
  "caret-down": '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg>',
  "check": '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg>',
};

function iconEl(name, extraClass) {
  const tpl = document.createElement("template");
  tpl.innerHTML = ICON_SVGS[name];
  const el = tpl.content.firstElementChild;
  if (extraClass) el.classList.add(extraClass);
  return el;
}

function initSelectionSwitch(containerOrId) {
  const container =
    typeof containerOrId === "string"
      ? document.getElementById(containerOrId)
      : containerOrId;
  if (!container || container.dataset.switchInitialized === "true") return;

  const options = container.querySelectorAll(".switch-option");
  window.switchManager[container.id] = {
    setActive: (value) => {
      options.forEach((opt) => {
        opt.classList.toggle("active", (opt.dataset.value || opt.id) === value);
      });
    },
    getActive: () => {
      const active = container.querySelector(".switch-option.active");
      return active ? active.dataset.value || active.id : null;
    },
  };

  options.forEach((option) => {
    option.addEventListener("click", () => {
      options.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      const value = option.dataset.value || option.id;
      container.dispatchEvent(
        new CustomEvent("change", {
          detail: { value, element: option },
        }),
      );
    });
  });

  container.dataset.switchInitialized = "true";
}

function initSelectionDropdown(containerOrId) {
  const container =
    typeof containerOrId === "string"
      ? document.getElementById(containerOrId)
      : containerOrId;
  if (!container || container.dataset.dropdownInitialized === "true") return;

  const trigger = container.querySelector(".selection-dropdown__trigger");
  const triggerText = container.querySelector(".selection-dropdown__trigger-text");
  const menu = container.querySelector(".selection-dropdown__menu");
  const options = Array.from(
    container.querySelectorAll(".selection-dropdown__option"),
  );
  if (!trigger || !triggerText || !menu || options.length === 0) return;

  function setActive(value, shouldDispatch) {
    const activeOption = options.find((opt) => opt.dataset.value === value);
    if (!activeOption) return;
    options.forEach((opt) => {
      const isActive = opt === activeOption;
      opt.classList.toggle("active", isActive);
      opt.setAttribute("aria-selected", String(isActive));
    });
    const label = activeOption.querySelector(".selection-dropdown__option-label");
    triggerText.textContent = (label || activeOption).textContent;
    if (shouldDispatch) {
      container.dispatchEvent(
        new CustomEvent("change", {
          detail: { value, element: activeOption },
        }),
      );
    }
  }

  function setOpen(open) {
    menu.classList.toggle("collapsed", !open);
    trigger.setAttribute("aria-expanded", String(open));
  }

  function getActive() {
    const active = container.querySelector(".selection-dropdown__option.active");
    return active ? active.dataset.value : null;
  }

  const initial = options.find((opt) => opt.classList.contains("active")) || options[0];
  setActive(initial.dataset.value, false);
  setOpen(false);

  window.dropdownManager[container.id] = {
    setActive: (value) => setActive(value, false),
    getActive,
    close: () => setOpen(false),
  };

  trigger.addEventListener("click", () => {
    setOpen(trigger.getAttribute("aria-expanded") !== "true");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      setActive(option.dataset.value, true);
      setOpen(false);
    });
  });

  container.dataset.dropdownInitialized = "true";
}

document.addEventListener("click", (event) => {
  document.querySelectorAll(".selection-dropdown").forEach((container) => {
    if (!container.contains(event.target)) {
      const manager = window.dropdownManager[container.id];
      if (manager) manager.close();
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  Object.values(window.dropdownManager).forEach((m) => m.close && m.close());
});

function initRangeSlider(container) {
  if (!container || container.dataset.rangeInitialized === "true") return;

  const input = container.querySelector('input[type="range"]');
  if (!input) return;

  const value = container.querySelector(`#${input.id.replace(/-input$/, "-value")}`);

  function updateRangeFill() {
    const percent = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--value-percent", `${percent}%`);
  }

  updateRangeFill();
  input.addEventListener("input", () => {
    if (value) value.textContent = input.value;
    updateRangeFill();
  });

  container.dataset.rangeInitialized = "true";
}

function initImageUpload(containerOrId) {
  const container =
    typeof containerOrId === "string"
      ? document.getElementById(containerOrId)
      : containerOrId;
  if (!container || container.dataset.imageUploadInitialized === "true") return;

  const selector = container.querySelector(".image-upload__selector");
  const input = container.querySelector(".image-upload__input");
  const preview = container.querySelector(".image-upload__preview");
  if (!selector || !input || !preview) return;

  function setImage(file, dataUrl) {
    preview.src = dataUrl;
    preview.alt = file && file.name ? file.name : "";
    container.classList.add("image-upload--has-preview");

    const detail = { file, dataUrl, image: preview };
    container.dispatchEvent(new CustomEvent("image-upload:change", { detail }));
    container.dispatchEvent(new CustomEvent("change", { detail }));
  }

  selector.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(file, event.target.result);
    };
    reader.readAsDataURL(file);
  });

  if (container.id) {
    window.imageUploadManager[container.id] = {
      getImage: () => preview,
      getFile: () => (input.files && input.files[0]) || null,
      hasImage: () => container.classList.contains("image-upload--has-preview"),
    };
  }

  container.dataset.imageUploadInitialized = "true";
}

function initSearchComponent(containerOrId) {
  const container =
    typeof containerOrId === "string"
      ? document.getElementById(containerOrId)
      : containerOrId;
  if (!container || container.dataset.searchInitialized === "true") return;

  const trigger = container.querySelector(".site-search__trigger");
  const input = container.querySelector(".site-search__field input");
  const clear = container.querySelector(".site-search__clear");
  if (!trigger || !input) return;

  function getQuery() {
    return input.value.trim().toLowerCase();
  }

  function emitChange() {
    const query = getQuery();
    const detail = { query, value: query, input };
    container.classList.toggle("has-query", query.length > 0);
    if (clear) clear.hidden = query.length === 0;

    container.dispatchEvent(new CustomEvent("change", { detail }));
    container.dispatchEvent(new CustomEvent("search:change", { detail }));

    if (container.dataset.searchTarget) {
      const target = document.querySelector(container.dataset.searchTarget);
      if (target) {
        target.dataset.searchQuery = query;
        target.dispatchEvent(
          new CustomEvent("site-search:change", {
            detail: { ...detail, source: container },
          }),
        );
      }
    }
  }

  function setOpen(open, focusInput) {
    container.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    if (open && focusInput) input.focus();
  }

  function setValue(value, shouldEmit) {
    input.value = value || "";
    container.classList.toggle("has-query", getQuery().length > 0);
    if (clear) clear.hidden = getQuery().length === 0;
    if (shouldEmit) emitChange();
  }

  if (container.id) {
    window.searchManager[container.id] = {
      open: () => setOpen(true, true),
      close: () => setOpen(false, false),
      clear: () => setValue("", true),
      setValue: (value) => setValue(value, true),
      getValue: getQuery,
    };
  }

  trigger.addEventListener("click", () => setOpen(true, true));
  input.addEventListener("input", emitChange);
  input.addEventListener("focus", () => setOpen(true, false));
  input.addEventListener("blur", () => {
    if (!getQuery()) setOpen(false, false);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (getQuery()) {
      setValue("", true);
    }
    setOpen(false, false);
    trigger.focus();
  });

  if (clear) {
    clear.addEventListener("click", () => {
      setValue("", true);
      setOpen(true, true);
    });
  }

  setValue(input.value, false);
  container.dataset.searchInitialized = "true";
}

window.buildSwitch = window.buildSwitch || function ({ id, options, active, size, ariaLabel, className }) {
  const el = document.createElement("div");
  el.className = [
    "selection-switch",
    size === "small" && "selection-switch--small",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (id) el.id = id;
  if (ariaLabel) el.setAttribute("aria-label", ariaLabel);

  options.forEach((opt) => {
    const span = document.createElement("span");
    span.className = "switch-option" + (opt.value === active ? " active" : "");
    span.dataset.value = opt.value;
    span.textContent = opt.label;
    el.appendChild(span);
  });

  initSelectionSwitch(el);
  return el;
};

window.buildDropdown = window.buildDropdown || function ({ id, options, active, ariaLabel, className }) {
  const el = document.createElement("div");
  el.className = ["selection-dropdown", className].filter(Boolean).join(" ");
  if (id) el.id = id;
  el.dataset.selectionDropdown = "";
  if (ariaLabel) el.setAttribute("aria-label", ariaLabel);

  const trigger = document.createElement("button");
  trigger.className = "selection-dropdown__trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerText = document.createElement("span");
  triggerText.className = "selection-dropdown__trigger-text";

  const chevron = iconEl("caret-down", "selection-dropdown__chevron");

  trigger.append(triggerText, chevron);

  const menu = document.createElement("div");
  menu.className = "selection-dropdown__menu collapsed";
  menu.setAttribute("role", "listbox");

  options.forEach((opt) => {
    const optEl = document.createElement("button");
    optEl.type = "button";
    const isActive = opt.value === active;
    optEl.className =
      "selection-dropdown__option" + (isActive ? " active" : "");
    optEl.dataset.value = opt.value;
    optEl.setAttribute("role", "option");
    optEl.setAttribute("aria-selected", String(isActive));

    const label = document.createElement("span");
    label.className = "selection-dropdown__option-label";
    label.textContent = opt.label;

    const check = iconEl("check", "selection-dropdown__option-check");

    optEl.append(label, check);
    menu.appendChild(optEl);
  });

  el.append(trigger, menu);
  initSelectionDropdown(el);
  return el;
};

window.initSwitch = window.initSwitch || function (id, callback) {
  const container = document.getElementById(id);
  if (!container) return;

  initSelectionSwitch(container);
  container.addEventListener("change", (e) =>
    callback(e.detail.value, e.detail.element),
  );
};

window.initDropdown = window.initDropdown || function (id, callback) {
  const container = document.getElementById(id);
  if (!container) return;

  initSelectionDropdown(container);
  container.addEventListener("change", (e) =>
    callback(e.detail.value, e.detail.element),
  );
};

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

// Settings panel toggle
function toggleSettings() {
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;

  const isOpen = panel.classList.toggle("revealed");
  const menu = document.getElementById("siteNameMenu");

  // Keep the nav menu open while settings is open
  if (menu) {
    if (isOpen) {
      menu.classList.add("is-open");
    } else {
      menu.classList.remove("is-open");
    }
  }

  // Toggle settings/close text on all settings links
  document.querySelectorAll(".settings-toggle-text").forEach((el) => {
    el.textContent = isOpen ? "close" : "settings";
  });
}

// Site name click handler — on touch devices, toggles the nav menu; on desktop, triggers photo
function handleSiteNameClick(event) {
  const menu = document.getElementById("siteNameMenu");
  if (!menu) return;

  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    menu.classList.toggle("is-open");
  } else {
    triggerPhotoReveal("/assets/images/me.jpg");
  }
}

// Touch hover handler for mobile devices
if ("ontouchstart" in window) {
  const SELECTORS =
    "a, button, .btn, .switch-option, .selection-dropdown__trigger, .selection-dropdown__option, .expandable-toggle, .site-search__trigger";
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
  document.querySelectorAll(".selection-switch").forEach(initSelectionSwitch);
  document
    .querySelectorAll("[data-selection-dropdown]")
    .forEach(initSelectionDropdown);
  document
    .querySelectorAll("[data-search-component]")
    .forEach(initSearchComponent);
  document.querySelectorAll("[data-range-slider]").forEach(initRangeSlider);
  document.querySelectorAll("[data-image-upload]").forEach(initImageUpload);

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

      Clipboard.copy(textToCopy).then(() => {
        this.innerHTML = `${ICON_SVGS["check"]} ${feedbackText}`;
        setTimeout(() => {
          this.innerHTML = originalContent;
        }, 1500);
      });
    });
  });
});
