// Sunny Mode — dappled-light canvas overlay
// Activates when data-theme="sunny". Draws soft drifting blobs with
// mix-blend-mode: multiply over the warm background to simulate sunlight
// filtering through a leafy canopy.

(function () {
  'use strict';

  var canvas = null, ctx = null, animId = null;
  var blobs = [], W = 0, H = 0;
  var opacity = 0, targetOpacity = 0;
  var BLOB_COUNT = 14;

  function makeBlob() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 80 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.18 + Math.random() * 0.38,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'sunny-overlay';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    setSize();
  }

  function setSize() {
    if (!canvas) return;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }

  function frame(ts) {
    if (!canvas) { animId = null; return; }

    // Smooth fade in/out
    var step = 0.022;
    if (opacity < targetOpacity) opacity = Math.min(targetOpacity, opacity + step);
    else if (opacity > targetOpacity) opacity = Math.max(targetOpacity, opacity - step);

    canvas.style.opacity = opacity;

    // Stop loop once fully faded out
    if (opacity <= 0 && targetOpacity === 0) {
      canvas.style.display = 'none';
      animId = null;
      return;
    }

    // White background — multiply(white, bg) = bg, so white areas are invisible
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];

      // Gentle breathing
      var breathe = 0.88 + 0.12 * Math.sin(ts / 4500 + b.phase);
      var r = b.r * breathe;

      // Warm brown blobs: multiply(brown, butter) creates leaf-shadow warmth
      var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      g.addColorStop(0,   'rgba(85, 62, 18, ' + b.alpha + ')');
      g.addColorStop(0.55,'rgba(85, 62, 18, ' + (b.alpha * 0.22) + ')');
      g.addColorStop(1,   'rgba(85, 62, 18, 0)');

      ctx.fillStyle = g;
      ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);

      // Drift
      b.x += b.vx;
      b.y += b.vy;

      // Wrap around edges
      if (b.x < -b.r) b.x = W + b.r;
      if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r;
      if (b.y > H + b.r) b.y = -b.r;
    }

    animId = requestAnimationFrame(frame);
  }

  function activate() {
    ensureCanvas();
    canvas.style.display = 'block';
    targetOpacity = 1;
    if (!blobs.length) {
      for (var i = 0; i < BLOB_COUNT; i++) blobs.push(makeBlob());
    }
    if (!animId) animId = requestAnimationFrame(frame);
  }

  function deactivate() {
    targetOpacity = 0;
    // Resume loop to fade out if currently visible
    if (!animId && canvas && opacity > 0) {
      animId = requestAnimationFrame(frame);
    }
  }

  function check() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'sunny') activate();
    else deactivate();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    check();
  });

  window.addEventListener('resize', setSize);
})();
