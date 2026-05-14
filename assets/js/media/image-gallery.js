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

  function getNestedValue(item, path) {
    if (!path) return undefined;
    return path.split(".").reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, item);
  }

  function firstValue(item, paths) {
    for (const path of paths) {
      const value = getNestedValue(item, path);
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return "";
  }

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

  function stringifyMeta(value) {
    if (!value) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(" · ");
    if (typeof value === "object") {
      return Object.values(value).filter(Boolean).join(" · ");
    }
    return String(value);
  }

  function normalizeItem(item, index, options) {
    const title = firstValue(item, options.titlePaths);
    const year = firstValue(item, options.yearPaths);
    const collection = firstValue(item, options.collectionPaths);
    const series = firstValue(item, options.seriesPaths);
    const thumb = resolveUrl(firstValue(item, options.thumbPaths), options.baseUrl);
    const full = resolveUrl(firstValue(item, options.fullPaths), options.baseUrl) || thumb;
    const explicitMeta = stringifyMeta(firstValue(item, options.metaPaths));
    const width = Number(firstValue(item, options.widthPaths));
    const height = Number(firstValue(item, options.heightPaths));
    const popularity = Number(firstValue(item, options.popularityPaths));

    const normalized = {
      raw: item,
      index,
      title: title || "",
      alt: title || "Gallery Image",
      year: year || "",
      collection: collection || "",
      series: series || "",
      detail: explicitMeta || [year, collection].filter(Boolean).join(" · "),
      captionMeta: [year, series].filter(Boolean).join(" · "),
      thumb,
      full,
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      popularity: Number.isFinite(popularity) ? popularity : 0,
    };
    normalized.searchText = [
      normalized.title,
      normalized.year,
      normalized.collection,
      normalized.series,
      normalized.detail,
      stringifyMeta(item.tags),
      stringifyMeta(item.keywords),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return normalized;
  }

  function getItemsFromManifest(manifest, itemsKey) {
    if (Array.isArray(manifest)) return manifest;
    if (itemsKey && Array.isArray(manifest[itemsKey])) return manifest[itemsKey];
    if (Array.isArray(manifest.items)) return manifest.items;
    if (Array.isArray(manifest.images)) return manifest.images;
    if (Array.isArray(manifest.paintings)) return manifest.paintings;
    return [];
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
      if (state.decade !== "all" && getDecadeValue(item) !== state.decade) {
        return false;
      }
      if (state.series !== "all" && item.series !== state.series) {
        return false;
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

    if (state.sortOptions.length > 0) {
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

    if (state.filterOptions.includes("decade")) {
      const decades = uniqueValues(items, getDecadeValue).sort((a, b) => {
        return Number.parseInt(b, 10) - Number.parseInt(a, 10);
      });
      const decadeSwitch = buildSwitch({
        id: `image-gallery-decade-${galleryName}`,
        ariaLabel: "Filter by decade",
        options: [
          { value: "all", label: "All" },
          ...decades.map((decade) => ({ value: decade, label: decade })),
        ],
        active: state.decade,
        size: "small",
      });
      decadeSwitch.addEventListener("change", (event) => {
        state.decade = event.detail.value;
        applyState();
      });
      controlsRoot.appendChild(createControlGroup("Decade", decadeSwitch));
    }

    if (state.filterOptions.includes("series")) {
      const seriesOptions = uniqueValues(items, (item) => item.series)
        .map((series) => ({ value: series, label: humanizeValue(series) }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const dropdown = buildDropdown({
        id: `image-gallery-series-${galleryName}`,
        ariaLabel: "Filter by series",
        options: [{ value: "all", label: "All series" }, ...seriesOptions],
        active: state.series,
      });
      dropdown.addEventListener("change", (event) => {
        state.series = event.detail.value;
        applyState();
      });
      controlsRoot.appendChild(createControlGroup("Series", dropdown));
    }
  }

  function setLoaded(card, img) {
    const markLoaded = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const ratioBox = img.closest(".image-ratio-box");
        if (ratioBox) {
          ratioBox.style.paddingBottom =
            (img.naturalHeight / img.naturalWidth) * 100 + "%";
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
    ratioBox.style.paddingBottom = (1 / aspectRatio) * 100 + "%";

    const img = document.createElement("img");
    img.dataset.src = item.thumb;
    img.alt = item.alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.setAttribute("data-zoomable", "");
    img.setAttribute("data-full-src", item.full);
    img.setAttribute("data-gallery-index", options.galleryIndex ?? item.index);
    if (item.title) img.setAttribute("data-title", item.title);
    if (item.detail) img.setAttribute("data-meta", item.detail);

    ratioBox.appendChild(img);
    card.appendChild(ratioBox);

    if (options.showCaptions && (item.title || item.captionMeta)) {
      const caption = document.createElement("div");
      caption.className = "image-gallery-card__caption";

      if (item.title) {
        const title = document.createElement("div");
        title.className = "image-gallery-card__title";
        title.textContent = item.title;
        caption.appendChild(title);
      }

      if (item.captionMeta) {
        const meta = document.createElement("div");
        meta.className = "image-gallery-card__meta";
        meta.textContent = item.captionMeta;
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
    const itemsKey = config.itemsKey || root.dataset.galleryItemsKey;
    const galleryName = config.galleryName || root.dataset.galleryName;
    const baseUrl = config.baseUrl || root.dataset.galleryBaseUrl || "";
    const showCaptions =
      config.showCaptions !== undefined
        ? config.showCaptions
        : root.dataset.galleryShowCaptions !== "false";
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
      const rawItems = getItemsFromManifest(manifest, itemsKey);
      const options = {
        titlePaths: config.titlePaths || ["title", "name"],
        yearPaths: config.yearPaths || ["year", "date"],
        collectionPaths: config.collectionPaths || ["collection", "museum"],
        seriesPaths: config.seriesPaths || ["series"],
        thumbPaths: config.thumbPaths || ["image.thumb", "thumb", "thumbnail"],
        fullPaths: config.fullPaths || ["image.full", "full", "image"],
        metaPaths: config.metaPaths || ["meta"],
        widthPaths: config.widthPaths || ["image.width", "width", "dimensions.width_cm"],
        heightPaths: config.heightPaths || ["image.height", "height", "dimensions.height_cm"],
        popularityPaths: config.popularityPaths || ["popularity.sitelinks", "sitelinks"],
        baseUrl,
      };
      const items = rawItems.map((item, index) => normalizeItem(item, index, options));
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
        decade: "all",
        series: "all",
        query: root.dataset.searchQuery || "",
      };

      const applyState = () => {
        const visibleItems = getVisibleItems(items, state);
        if (summary) {
          summary.hidden = false;
          summary.textContent = formatSummary(visibleItems.length, items.length);
        }
        renderMasonry(root, grid, visibleItems, galleryName, { showCaptions });
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
          galleryItemsKey: "images",
          galleryName: album,
          galleryBaseUrl: baseUrl,
          galleryShowCaptions: "false",
        },
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
