/**
 * Handles the back button navigation logic
 * - If the previous page is not from the same domain, redirects to homepage
 * - If the previous page is the same as current page, redirects to homepage
 * - Otherwise, performs normal browser back navigation
 */
function handleBackNavigation() {
  const currentUrl = window.location.href;
  const currentDomain = window.location.hostname;
  
  const referrer = document.referrer;

  if (!referrer) {
    window.location.href = '/';
    return;
  }
  
  let referrerUrl;
  try {
    referrerUrl = new URL(referrer);
  } catch (e) {
    window.location.href = '/';
    return;
  }
  
  if (referrerUrl.hostname !== currentDomain) {
    window.location.href = '/';
    return;
  }
  
  if (referrer === currentUrl) {
    window.location.href = '/';
    return;
  }
  
  window.history.back();
}

// Toggles `is-scrolled` on <html> so CSS can react to non-zero scroll positions.
(function () {
  const root = document.documentElement;
  let ticking = false;
  function update() {
    root.classList.toggle('is-scrolled', window.scrollY > 30);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
})();
