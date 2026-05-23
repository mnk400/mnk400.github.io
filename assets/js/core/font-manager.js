// Font Manager - Handles font family switching

let currentFont = "default";

const fontStacks = {
  "default": '-apple-system, "SF Pro Display", "Inter", sans-serif',
  "source-serif": '"Source Serif 4", serif',
  "inconsolata": '"Inconsolata", monospace',
};

// Probe string used to ask the browser to load a webfont. The default stack is
// system-only, so no probe is needed.
const fontProbes = {
  "source-serif": '1em "Source Serif 4"',
  "inconsolata": '1em "Inconsolata"',
};

const fontScale = {
};

function applyFont(font) {
  currentFont = font;
  localStorage.setItem("font", font);
  document.documentElement.style.setProperty("--font-family", fontStacks[font]);
  document.documentElement.style.setProperty("--font-size-scale", fontScale[font] || "1");
  updateFontSwitch();
}

function setFont(font) {
  if (!fontStacks[font]) return;

  // Reflect the selection in the switcher immediately so the click feels
  // responsive, even if the font file isn't ready yet.
  currentFont = font;
  updateFontSwitch();

  const probe = fontProbes[font];
  if (probe && document.fonts && document.fonts.load) {
    document.fonts.load(probe).then(() => {
      // Only apply once the font is actually available — avoids the flash
      // through the generic serif/monospace fallback.
      if (currentFont === font) applyFont(font);
    }).catch(() => applyFont(font));
  } else {
    applyFont(font);
  }
}

function updateFontSwitch() {
  const buttons = document.querySelectorAll("#fontSwitch .switch-option");
  buttons.forEach((btn) => {
    if (btn.dataset.value === currentFont) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const validFonts = Object.keys(fontStacks);
  const savedFont = localStorage.getItem("font") || "default";
  const font = validFonts.includes(savedFont) ? savedFont : "default";
  setFont(font);
});
