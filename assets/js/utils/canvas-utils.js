// =============================================================================
// CANVAS UTILITIES
// Shared helpers for canvas-based components: CSS variable reading, DPR-aware
// canvas setup, debounce, and theme-change observation.
// =============================================================================

(function () {
  var cssCache = {};

  function css(prop) {
    if (!(prop in cssCache)) {
      cssCache[prop] = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    }
    return cssCache[prop];
  }

  function invalidateCssCache() {
    cssCache = {};
  }

  function dpr() {
    return window.devicePixelRatio || 1;
  }

  function setupCanvas(canvas, width, height) {
    var r = dpr();
    canvas.width = width * r;
    canvas.height = height * r;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(r, r);
    return ctx;
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(context, args); }, wait);
    };
  }

  function onThemeChange(callback) {
    new MutationObserver(function () {
      invalidateCssCache();
      callback();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  window.CanvasUtils = {
    css: css,
    invalidateCssCache: invalidateCssCache,
    dpr: dpr,
    setupCanvas: setupCanvas,
    debounce: debounce,
    onThemeChange: onThemeChange,
  };
})();
