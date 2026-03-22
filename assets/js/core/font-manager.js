// Font Manager - Handles font family switching

let currentFont = "default";

const fontStacks = {
  "default": '-apple-system, "SF Pro Display", "Inter", sans-serif',
  "source-serif": '"Source Serif 4", serif',
  "inconsolata": '"Inconsolata", monospace',
};

const fontScale = {
};

function setFont(font) {
  if (!fontStacks[font]) return;
  currentFont = font;
  localStorage.setItem("font", font);
  document.documentElement.style.setProperty("--font-family", fontStacks[font]);
  document.documentElement.style.setProperty("--font-size-scale", fontScale[font] || "1");
  updateFontSwitch();
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
