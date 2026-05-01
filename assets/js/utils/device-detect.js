// =============================================================================
// DEVICE DETECTION
// Lightweight heuristics for branching behavior on mobile / touch devices.
// =============================================================================

(function () {
  var MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  // Treat the device as mobile if any of: known mobile UA, narrow viewport,
  // or multi-touch capability. Combines the heuristics that were previously
  // duplicated across camera tools and game files.
  function isMobileDevice() {
    return (
      MOBILE_UA.test(navigator.userAgent) ||
      window.innerWidth <= 768 ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
    );
  }

  window.DeviceDetect = {
    isMobileDevice: isMobileDevice,
  };
})();
