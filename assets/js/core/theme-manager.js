// Theme Manager - Handles light, blue, and dark modes

let currentTheme = "light";
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

  if (theme === "dark") {
    metaThemeColor.content = "#1a1a1a";
  } else if (theme === "blue") {
    metaThemeColor.content = "#2D3D5A";
  } else if (theme === "red") {
    metaThemeColor.content = "#2a1a1d";
  } else if (theme === "matcha") {
    metaThemeColor.content = "#2a2f2a";
  } else {
    metaThemeColor.content = "#f2f0ef";
  }
}

function updateThemeSwitch() {
  const buttons = document.querySelectorAll("#themeSwitch .switch-option");
  buttons.forEach((btn) => {
    if (btn.dataset.theme === currentTheme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const overrides = window.__urlOverrides || {};
  const validThemes = ["light", "blue", "dark", "red", "matcha"];

  let theme;
  if (overrides.theme) {
    theme = overrides.theme;
  } else {
    const savedTheme = localStorage.getItem("theme") || "light";
    theme = validThemes.includes(savedTheme) ? savedTheme : "light";
  }

  setTheme(theme, true);
});
