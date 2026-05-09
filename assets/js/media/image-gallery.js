/**
 * Image Gallery
 * Generic manifest-backed image gallery renderer.
 */

(function () {
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

    return {
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
    };
  }

  function getItemsFromManifest(manifest, itemsKey) {
    if (Array.isArray(manifest)) return manifest;
    if (itemsKey && Array.isArray(manifest[itemsKey])) return manifest[itemsKey];
    if (Array.isArray(manifest.items)) return manifest.items;
    if (Array.isArray(manifest.images)) return manifest.images;
    if (Array.isArray(manifest.paintings)) return manifest.paintings;
    return [];
  }

  function setLoaded(card, img) {
    const markLoaded = () => card.classList.add("loaded");
    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
      return;
    }
    img.addEventListener("load", markLoaded, { once: true });
    img.addEventListener("error", markLoaded, { once: true });
  }

  function createCard(item, options) {
    const card = document.createElement("div");
    card.className = "image-card image-gallery-card";

    const ratioBox = document.createElement("div");
    ratioBox.className = "image-ratio-box";

    const aspectRatio = item.width && item.height ? item.width / item.height : 1;
    ratioBox.style.paddingBottom = (1 / aspectRatio) * 100 + "%";

    const img = document.createElement("img");
    img.src = item.thumb;
    img.alt = item.alt;
    img.loading = "lazy";
    img.setAttribute("data-zoomable", "");
    img.setAttribute("data-full-src", item.full);
    img.setAttribute("data-gallery-index", item.index);
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

  function renderMasonry(grid, items, galleryName, options) {
    grid.innerHTML = "";
    grid.setAttribute("data-gallery", galleryName || "image-gallery");

    const leftCol = document.createElement("div");
    const rightCol = document.createElement("div");
    leftCol.className = "masonry-column";
    rightCol.className = "masonry-column";
    grid.append(leftCol, rightCol);

    let leftHeight = 0;
    let rightHeight = 0;

    items.forEach((item) => {
      if (!item.thumb) return;

      const card = createCard(item, options);
      const aspectRatio = item.width && item.height ? item.width / item.height : 1;
      const estimatedHeight = 300 / aspectRatio;

      if (leftHeight <= rightHeight) {
        leftCol.appendChild(card);
        leftHeight += estimatedHeight;
      } else {
        rightCol.appendChild(card);
        rightHeight += estimatedHeight;
      }
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

    if (!source || !grid) return;

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
        baseUrl,
      };
      const items = rawItems.map((item, index) => normalizeItem(item, index, options));

      if (status) status.hidden = true;
      if (summary) {
        summary.hidden = false;
        summary.textContent = `${items.length.toLocaleString()} works`;
      }

      renderMasonry(grid, items, galleryName, { showCaptions });
      root.dispatchEvent(
        new CustomEvent("image-gallery:loaded", {
          detail: { manifest, items },
        }),
      );
    } catch (error) {
      console.error("Error loading image gallery:", error);
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
