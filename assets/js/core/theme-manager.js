// Theme Manager

let currentTheme = window.__themeConfig.default;
let isInitialLoad = true;

function setTheme(theme, skipTransition = false) {
  currentTheme = theme;

  localStorage.setItem("theme", theme);

  if (!skipTransition && !isInitialLoad) {
    // add transition class to enable animations
    // remove transition classes after animation completes
    // so we avoid animations on page refreshes
    document.documentElement.classList.add("theme-transition");
    document.body.classList.add("theme-transition");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
      document.body.classList.remove("theme-transition");
    }, 500);
  }

  // Set the data-theme attribute
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeColorMeta(theme);

  updateThemeSwitch();

  isInitialLoad = false;
}

function updateThemeColorMeta(theme) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);
  }

  const tc = window.__themeConfig;
  const entry = tc.themes[theme] || tc.themes[tc.default];
  metaThemeColor.content = entry.meta;
}

function updateThemeSwitch() {
  const buttons = document.querySelectorAll("#themeSwitch .switch-option");
  buttons.forEach((btn) => {
    if (btn.dataset.value === currentTheme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const tc = window.__themeConfig;
  const overrides = window.__urlOverrides || {};

  let theme;
  if (overrides.theme) {
    theme = overrides.theme;
  } else {
    const savedTheme = localStorage.getItem("theme") || tc.default;
    theme = tc.names.includes(savedTheme) ? savedTheme : tc.default;
  }

  setTheme(theme, true);
});
