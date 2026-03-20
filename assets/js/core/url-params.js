// URL Params - Central registry for all URL parameter overrides
// Loaded synchronously in <head> after theme-config.js, before CSS to prevent flash
//
// To add a new param: add an entry to the `schema` object with valid values,
// then read it anywhere via window.__urlOverrides.yourParam

(function () {
  var tc = window.__themeConfig;
  var params = new URLSearchParams(window.location.search);

  var schema = {
    theme: tc.names,
  };

  var overrides = {};

  for (var key in schema) {
    var value = params.get(key);
    if (value && schema[key].indexOf(value) !== -1) {
      overrides[key] = value;
    }
  }

  // Flash-critical: apply theme before CSS loads
  var theme = overrides.theme || localStorage.getItem("theme");
  if (!theme || tc.names.indexOf(theme) === -1) theme = tc.default;
  document.documentElement.setAttribute("data-theme", theme);

  window.__urlOverrides = overrides;
})();
