/**
 * Image Gallery
 * Generic manifest-backed image gallery renderer.
 */

(function () {
  const SORT_LABELS = {
    "year-desc": "Latest first",
    "year-asc": "Earliest first",
    "popularity-desc": "Popular first",
  };
  function resolveUrl(value, baseUrl) {
    if (!value) return "";
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
      return value;
    }
    if (!baseUrl) return value;

    const base = baseUrl.replace(/\/$/, "");
    const path = String(value).replace(/^\//, "");
    return `${base}/${path}`;
  }

  function normalizeItem(item, index, baseUrl) {
    const title = item.title || "";
    const description = item.description || "";
    const year = item.year || "";
    const meta = item.meta && typeof item.meta === "object" ? item.meta : {};
    const thumb = resolveUrl(item.thumb, baseUrl);
    const full = resolveUrl(item.full, baseUrl) || thumb;
    const width = Number(item.width);
    const height = Number(item.height);
    const popularity = Number(item.popularity?.score) || 0;
    const tags = Array.isArray(item.tags) ? item.tags : [];

    const normalized = {
      raw: item,
      index,
      title,
      description,
      meta,
      alt: title || description || "Gallery image",
      year,
      thumb,
      full,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      popularity,
    };
    normalized.searchText = [
      title,
      description,
      year,
      Object.values(meta)
        .filter((value) => ["number", "string"].includes(typeof value))
        .join(" "),
      tags.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return normalized;
  }

  function readOption(configValue, datasetValue, fallback) {
    return configValue ?? datasetValue ?? fallback;
  }

  function getFieldValue(item, field) {
    if (!field) return "";
    if (field.startsWith("meta:")) {
      return item.meta?.[field.slice(5)] || "";
    }

    if (field.startsWith("raw:")) {
      return item.raw?.[field.slice(4)] || "";
    }

    if (field === "tags") {
      return Array.isArray(item.raw?.tags) ? item.raw.tags.join(", ") : "";
    }

    return item[field] || item.raw?.[field] || "";
  }

  function formatFields(item, fields) {
    return parseList(fields)
      .map((field) => getFieldValue(item, field))
      .filter(Boolean)
      .join(" · ");
  }

  function getItemsFromManifest(manifest) {
    return Array.isArray(manifest.items) ? manifest.items : [];
  }

  function parseList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function getYearValue(item) {
    const match = String(item.year || "").match(/\d{4}/);
    return match ? Number(match[0]) : null;
  }

  function getDecadeValue(item) {
    const year = getYearValue(item);
    if (!year) return "";
    return `${Math.floor(year / 10) * 10}s`;
  }

  const HUMANIZE_SMALL_WORDS = new Set(["and", "of", "on", "the"]);

  function humanizeValue(value) {
    return String(value)
      .replace(/[-_]+/g, " ")
      .split(" ")
      .map((word, index) => {
        if (index > 0 && HUMANIZE_SMALL_WORDS.has(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function uniqueValues(items, getValue) {
    return Array.from(
      new Set(items.map(getValue).filter((value) => value !== "")),
    );
  }

  function filterValue(item, option) {
    if (option === "decade") return getDecadeValue(item);
    return getFieldValue(item, option);
  }

  function filterLabel(option) {
    if (option === "decade") return "Decade";
    if (option.startsWith("meta:")) return option.slice(5);
    return humanizeValue(option);
  }

  function controlIdPart(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function sortItems(items, sortValue) {
    const sorted = [...items];

    if (sortValue === "popularity-desc") {
      sorted.sort((a, b) => {
        if (a.popularity === b.popularity) return a.index - b.index;
        return b.popularity - a.popularity;
      });
    } else if (sortValue === "year-asc" || sortValue === "year-desc") {
      sorted.sort((a, b) => {
        const yearA = getYearValue(a);
        const yearB = getYearValue(b);

        if (yearA === yearB) return a.index - b.index;
        if (yearA === null) return 1;
        if (yearB === null) return -1;

        return sortValue === "year-asc" ? yearA - yearB : yearB - yearA;
      });
    }

    return sorted;
  }

  function createControlGroup(label, control) {
    const group = document.createElement("div");
    group.className = "image-gallery__control-group field";
    group.setAttribute("aria-label", label);

    group.appendChild(control);
    return group;
  }

  function formatSummary(visibleCount, totalCount) {
    if (visibleCount === totalCount) {
      return `${totalCount.toLocaleString()} works`;
    }
    return `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} works`;
  }

  function getVisibleItems(items, state) {
    const query = state.query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      for (const option of state.filterOptions) {
        const selected = state.filters[option] || "all";
        if (selected !== "all" && filterValue(item, option) !== selected) {
          return false;
        }
      }
      if (query && !item.searchText.includes(query)) {
        return false;
      }
      return true;
    });

    return sortItems(filtered, state.sort);
  }

  function setupControls(root, items, galleryName, state, applyState) {
    const controlsRoot = root.querySelector("[data-gallery-controls-root]");
    if (!controlsRoot) return;

    controlsRoot.innerHTML = "";
    controlsRoot.hidden = false;

    if (state.sortOptions.length > 1) {
      const sortOptions = state.sortOptions.map((value) => ({
        value,
        label: SORT_LABELS[value] || value,
      }));
      const sortSwitch = buildSwitch({
        id: `image-gallery-sort-${galleryName}`,
        ariaLabel: "Sort paintings",
        options: sortOptions,
        active: state.sort,
        size: "small",
      });
      sortSwitch.addEventListener("change", (event) => {
        state.sort = event.detail.value;
        applyState();
      });
      controlsRoot.appendChild(createControlGroup("Sort", sortSwitch));
    }

    state.filterOptions.forEach((option) => {
      const label = filterLabel(option);
      const values = uniqueValues(items, (item) => filterValue(item, option));
      if (values.length <= 1) return;

      if (option === "decade") {
        values.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
      }

      const filterOptions = values
        .map((value) => ({
          value,
          label: value,
        }))
        .sort((a, b) => {
          if (option === "decade") return 0;
          return a.label.localeCompare(b.label);
        });
      const controlConfig = {
        id: `image-gallery-${controlIdPart(option)}-${galleryName}`,
        ariaLabel: `Filter by ${label.toLowerCase()}`,
        options: [{ value: "all", label: option === "decade" ? "All" : `All ${label.toLowerCase()}` }, ...filterOptions],
        active: state.filters[option] || "all",
      };
      const control =
        option === "decade"
          ? buildSwitch({ ...controlConfig, size: "small" })
          : buildDropdown(controlConfig);

      control.addEventListener("change", (event) => {
        state.filters[option] = event.detail.value;
        applyState();
      });
      controlsRoot.appendChild(createControlGroup(label, control));
    });
  }

  function setLoaded(card, img) {
    const markLoaded = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const ratioBox = img.closest(".image-ratio-box");
        if (ratioBox) {
          ratioBox.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        }
      }
      card.classList.add("loaded");
    };
    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
      return;
    }
    img.addEventListener("load", markLoaded, { once: true });
    img.addEventListener("error", markLoaded, { once: true });
  }

  function loadImage(img) {
    if (!img.dataset.src || img.getAttribute("src")) return;
    img.src = img.dataset.src;
  }

  function observeImage(img, observer) {
    if (observer) {
      observer.observe(img);
      return;
    }

    loadImage(img);
  }

  function createImageObserver() {
    if (!("IntersectionObserver" in window)) return null;

    return new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          observer.unobserve(entry.target);
          loadImage(entry.target);
        });
      },
      { rootMargin: "800px 0px" },
    );
  }

  function createCard(item, options) {
    const card = document.createElement("div");
    card.className = "image-card image-gallery-card";

    const ratioBox = document.createElement("div");
    ratioBox.className = "image-ratio-box";

    const aspectRatio = item.width && item.height ? item.width / item.height : 1;
    ratioBox.style.aspectRatio = `${item.width || 1} / ${item.height || 1}`;

    const img = document.createElement("img");
    img.dataset.src = item.thumb;
    img.alt = item.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.setAttribute("data-zoomable", "");
    img.setAttribute("data-full-src", item.full);
    img.setAttribute("data-gallery-index", options.galleryIndex ?? item.index);
    const zoomTitle = formatFields(item, options.zoomTitleFields);
    const zoomMeta = formatFields(item, options.zoomMetaFields);
    if (zoomTitle) img.setAttribute("data-title", zoomTitle);
    if (zoomMeta) img.setAttribute("data-meta", zoomMeta);

    ratioBox.appendChild(img);
    card.appendChild(ratioBox);

    const captionTitle = formatFields(item, options.captionTitleFields);
    const captionBody = formatFields(item, options.captionBodyFields);
    const captionMeta = formatFields(item, options.captionMetaFields);

    if (options.showCaptions && (captionTitle || captionBody || captionMeta)) {
      const caption = document.createElement("div");
      caption.className = "image-gallery-card__caption";

      if (captionTitle) {
        const title = document.createElement("div");
        title.className = "image-gallery-card__title";
        title.textContent = captionTitle;
        caption.appendChild(title);
      }

      if (captionBody) {
        const body = document.createElement("div");
        body.className = "image-gallery-card__body";
        body.textContent = captionBody;
        caption.appendChild(body);
      }

      if (captionMeta) {
        const meta = document.createElement("div");
        meta.className = "image-gallery-card__meta";
        meta.textContent = captionMeta;
        caption.appendChild(meta);
      }

      card.appendChild(caption);
    }
    setLoaded(card, img);

    return card;
  }

  function renderMasonry(root, grid, items, galleryName, options) {
    if (root.imageGalleryImageObserver) {
      root.imageGalleryImageObserver.disconnect();
    }

    grid.innerHTML = "";
    grid.setAttribute("data-gallery", galleryName || "image-gallery");

    const imageObserver = createImageObserver();
    root.imageGalleryImageObserver = imageObserver;

    const leftCol = document.createElement("div");
    const rightCol = document.createElement("div");
    leftCol.className = "masonry-column";
    rightCol.className = "masonry-column";
    grid.append(leftCol, rightCol);

    let leftHeight = 0;
    let rightHeight = 0;
    let imageCount = 0;

    items.forEach((item, displayIndex) => {
      if (!item.thumb) return;

      const card = createCard(item, {
        ...options,
        imageObserver,
        galleryIndex: displayIndex,
      });
      const aspectRatio = item.width && item.height ? item.width / item.height : 1;
      const estimatedHeight = 300 / aspectRatio;

      if (leftHeight <= rightHeight) {
        leftCol.appendChild(card);
        leftHeight += estimatedHeight;
      } else {
        rightCol.appendChild(card);
        rightHeight += estimatedHeight;
      }

      const img = card.querySelector("img");
      if (imageCount < 12) {
        loadImage(img);
      } else {
        observeImage(img, imageObserver);
      }
      imageCount += 1;
    });
  }

  async function loadGallery(root, config) {
    const source = config.source || root.dataset.gallerySource;
    const galleryName = config.galleryName || root.dataset.galleryName;
    const baseUrlOverride = config.baseUrl || root.dataset.galleryBaseUrl || "";
    const showCaptions =
      config.showCaptions !== undefined
        ? config.showCaptions
        : root.dataset.galleryShowCaptions !== "false";
    const captionTitleFields = readOption(
      config.captionTitle,
      root.dataset.galleryCaptionTitle,
      "title",
    );
    const captionBodyFields = readOption(
      config.captionBody,
      root.dataset.galleryCaptionBody,
      "",
    );
    const captionMetaFields = readOption(
      config.captionMeta,
      root.dataset.galleryCaptionMeta,
      "",
    );
    const zoomTitleFields = readOption(
      config.zoomTitle,
      root.dataset.galleryZoomTitle,
      "title",
    );
    const zoomMetaFields = readOption(
      config.zoomMeta,
      root.dataset.galleryZoomMeta,
      "",
    );
    const grid = root.querySelector("[data-gallery-grid]");
    const status = root.querySelector("[data-gallery-status]");
    const summary = root.querySelector("[data-gallery-summary]");
    const controlsEnabled =
      config.controls !== undefined
        ? config.controls
        : root.dataset.galleryControls === "true";

    if (!source || !grid) return;

    const slowLoadTimer = status
      ? setTimeout(() => {
          status.hidden = false;
        }, 500)
      : null;

    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch gallery manifest: ${response.status}`);
      }

      const manifest = await response.json();
      const baseUrl = baseUrlOverride || manifest.base_url || "";
      const rawItems = getItemsFromManifest(manifest);
      const items = rawItems.map((item, index) => normalizeItem(item, index, baseUrl));
      const state = {
        sortOptions: parseList(config.sortOptions || root.dataset.gallerySortOptions),
        filterOptions: parseList(
          config.filterOptions || root.dataset.galleryFilterOptions,
        ),
        sort:
          config.defaultSort ||
          root.dataset.galleryDefaultSort ||
          parseList(config.sortOptions || root.dataset.gallerySortOptions)[0] ||
          "manifest",
        filters: {},
        query: root.dataset.searchQuery || "",
      };
      state.filterOptions.forEach((option) => {
        state.filters[option] = "all";
      });

      const applyState = () => {
        const visibleItems = getVisibleItems(items, state);
        if (summary) {
          summary.hidden = false;
          summary.textContent = formatSummary(visibleItems.length, items.length);
        }
        renderMasonry(root, grid, visibleItems, galleryName, {
          showCaptions,
          captionTitleFields,
          captionBodyFields,
          captionMetaFields,
          zoomTitleFields,
          zoomMetaFields,
        });
        return visibleItems;
      };

      if (slowLoadTimer) clearTimeout(slowLoadTimer);
      if (status) status.hidden = true;

      if (controlsEnabled) {
        setupControls(root, items, galleryName, state, applyState);
      }

      root.addEventListener("site-search:change", (event) => {
        state.query = event.detail && event.detail.query ? event.detail.query : "";
        const visibleItems = applyState();
        root.dispatchEvent(
          new CustomEvent("image-gallery:filtered", {
            detail: { items, visibleItems, query: state.query },
          }),
        );
      });

      const visibleItems = applyState();
      root.classList.add("is-ready");
      root.dispatchEvent(
        new CustomEvent("image-gallery:loaded", {
          detail: { manifest, items, visibleItems },
        }),
      );
    } catch (error) {
      console.error("Error loading image gallery:", error);
      if (slowLoadTimer) clearTimeout(slowLoadTimer);
      if (status) {
        status.hidden = false;
        status.textContent = "Could not load images. Please try again later.";
      }
    }
  }

  function init(config = {}) {
    document.querySelectorAll("[data-image-gallery]").forEach((root) => {
      loadGallery(root, config);
    });
  }

  function loadAlbum(baseUrl, album, containerId, loadingId) {
    const grid = document.getElementById(containerId);
    const status = loadingId ? document.getElementById(loadingId) : null;
    if (!grid) {
      console.error("Gallery container not found:", containerId);
      return Promise.resolve();
    }

    return loadGallery(
      {
        dataset: {
          gallerySource: `${baseUrl.replace(/\/$/, "")}/${album}/manifest.json`,
          galleryName: album,
          galleryShowCaptions: "false",
        },
        addEventListener() {},
        querySelector(selector) {
          if (selector === "[data-gallery-grid]") return grid;
          if (selector === "[data-gallery-status]") return status;
          if (selector === "[data-gallery-summary]") return null;
          return null;
        },
        classList: { add() {} },
        dispatchEvent() {},
      },
      {},
    );
  }

  window.ImageGallery = {
    init,
    loadGallery,
    loadAlbum,
  };
  window.R2Gallery = { loadAlbum };

  document.addEventListener("DOMContentLoaded", () => init());
})();
