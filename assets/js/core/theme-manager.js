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

  updateThemeIcons();

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

function updateThemeIcons() {
  const themeIcon = document.querySelector(".theme-icon");

  if (themeIcon) {
    // Remove all possible icon classes
    themeIcon.classList.remove("ph-sun", "ph-moon", "ph-drop", "ph-heart", "ph-leaf");

    if (currentTheme === "light") {
      themeIcon.classList.add("ph-moon"); // Moon for dark theme next
    } else if (currentTheme === "dark") {
      themeIcon.classList.add("ph-drop"); // Drop for blue theme next
    } else if (currentTheme === "blue") {
      themeIcon.classList.add("ph-heart"); // Heart for red theme next
    } else if (currentTheme === "red") {
      themeIcon.classList.add("ph-leaf"); // Leaf for matcha theme next
    } else if (currentTheme === "matcha") {
      themeIcon.classList.add("ph-sun"); // Sun for light theme next
    }
  }
}

function toggleTheme() {
  if (currentTheme === "light") {
    setTheme("dark");
  } else if (currentTheme === "dark") {
    setTheme("blue");
  } else if (currentTheme === "blue") {
    setTheme("red");
  } else if (currentTheme === "red") {
    setTheme("matcha");
  } else {
    setTheme("light");
  }
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
