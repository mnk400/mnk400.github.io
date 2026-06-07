function updateLocationTime() {
  const el = document.getElementById("current-time-location");
  if (!el) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
  el.textContent = `${timeString} · Seattle, WA`;
}

// Track the interval handle so re-firing on client-side nav doesn't stack
// multiple timers. astro:page-load fires on initial load AND on every nav.
let _locationTimeInterval = null;
document.addEventListener("astro:page-load", () => {
  updateLocationTime();
  if (_locationTimeInterval) clearInterval(_locationTimeInterval);
  _locationTimeInterval = setInterval(updateLocationTime, 60000);
});
