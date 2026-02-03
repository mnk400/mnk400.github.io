// URL Params - Central registry for all URL parameter overrides
// Loaded synchronously in <head> before CSS to prevent flash
//
// To add a new param: add an entry to the `schema` object with valid values,
// then read it anywhere via window.__urlOverrides.yourParam

(function () {
  var params = new URLSearchParams(window.location.search);

  var schema = {
    theme: ["light", "dark", "blue", "red", "matcha"],
    header: ["minimal"],
  };

  var overrides = {};

  for (var key in schema) {
    var value = params.get(key);
    if (value && schema[key].indexOf(value) !== -1) {
      overrides[key] = value;
    }
  }

  // Flash-critical: apply theme before CSS loads
  // All themes valid for display (includes secret themes)
  var allValidThemes = schema.theme;
  var theme = overrides.theme || localStorage.getItem("theme");
  if (!theme || allValidThemes.indexOf(theme) === -1) theme = "light";
  document.documentElement.setAttribute("data-theme", theme);

  window.__urlOverrides = overrides;
})();
