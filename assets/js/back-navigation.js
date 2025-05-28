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

function toggleHeaderVisibility(showFull) {
  const header = document.querySelector('header');
  const minimalHeader = document.getElementById('minimalHeader');
  const fullHeader = document.getElementById('fullHeader');

  if (showFull) {
    // Transition to full header
    header.classList.remove('minimal-mode');
    minimalHeader.classList.remove('visible');
    fullHeader.classList.remove('hidden');
  } else {
    // Transition to minimal header
    header.classList.add('minimal-mode');
    minimalHeader.classList.add('visible');
    fullHeader.classList.add('hidden');
  }
}