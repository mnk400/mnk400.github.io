// Theme Config — single source of truth for theme names and metadata
// Loaded synchronously in <head> before all other scripts

window.__themeConfig = {
  default: "linen",
  themes: {
    linen:    { meta: "#f2f0ef" },
    charcoal: { meta: "#1a1a1a" },
    denim:    { meta: "#2D3D5A" },
    ruby:     { meta: "#2a1a1d" },
    matcha:   { meta: "#2a2f2a" },
    butter:   { meta: "#F1D799" },
  },
  get names() { return Object.keys(this.themes); },
};
