// =============================================================================
// CAMERA MANAGER
// Shared lifecycle for getUserMedia camera tools: start/stop, animation loop,
// fullscreen enter/exit. Caller supplies a render(video) callback plus optional
// hooks for cleanup and styling that differ per tool.
// =============================================================================

(function () {
  function noop() {}

  // Options:
  //   video             — HTMLVideoElement that receives the stream
  //   startBtn          — toggle button (Start / Stop)
  //   fullscreenBtn     — optional fullscreen button
  //   fullscreenTarget  — element to make fullscreen
  //   startLabel        — text shown when camera is stopped (default 'Start Camera')
  //   stopLabel         — text shown when camera is running  (default 'Stop Camera')
  //   render(video)     — called every animation frame while the camera is on
  //   onStart()         — after stream is acquired
  //   onStop()          — after stream is torn down (use to clear output / reset styles)
  //   onEnterFullscreen() — after fullscreen target is shown
  //   onExitFullscreen()  — after fullscreen exit is observed
  function create(opts) {
    var video = opts.video;
    var startBtn = opts.startBtn;
    var fullscreenBtn = opts.fullscreenBtn;
    var fullscreenTarget = opts.fullscreenTarget;
    var startLabel = opts.startLabel || "Start Camera";
    var stopLabel = opts.stopLabel || "Stop Camera";
    var render = opts.render;
    var onStart = opts.onStart || noop;
    var onStop = opts.onStop || noop;
    var onEnterFullscreen = opts.onEnterFullscreen || noop;
    var onExitFullscreen = opts.onExitFullscreen || noop;

    var stream = null;
    var rafId = null;
    var isFullscreen = false;

    function loop() {
      render(video);
      rafId = requestAnimationFrame(loop);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
        startBtn.textContent = stopLabel;
        onStart();
        loop();
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please make sure you have granted camera permissions.");
      }
    }

    function stop() {
      if (stream) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      video.srcObject = null;
      startBtn.textContent = startLabel;
      onStop();
    }

    startBtn.addEventListener("click", function () {
      if (stream) stop(); else start();
    });

    if (fullscreenBtn && fullscreenTarget) {
      fullscreenBtn.addEventListener("click", async function () {
        if (!stream) await start();
        if (!document.fullscreenElement) {
          try {
            await fullscreenTarget.requestFullscreen();
            isFullscreen = true;
            onEnterFullscreen();
          } catch (err) {
            console.error("Error attempting to enable fullscreen:", err);
          }
        }
      });

      document.addEventListener("fullscreenchange", function () {
        if (!document.fullscreenElement && isFullscreen) {
          isFullscreen = false;
          onExitFullscreen();
        }
      });
    }

    return {
      isRunning: function () { return stream !== null; },
      isFullscreen: function () { return isFullscreen; },
    };
  }

  window.CameraManager = { create: create };
})();
