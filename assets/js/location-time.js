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
  el.textContent = `${timeString} – Seattle, WA`;
}

document.addEventListener("DOMContentLoaded", () => {
  updateLocationTime();
  // Update every minute
  setInterval(updateLocationTime, 60000);
});
