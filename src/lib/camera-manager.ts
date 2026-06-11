// Shared lifecycle for getUserMedia tools: start/stop the stream, drive a
// render loop per RAF, and (optionally) toggle a fullscreen container.
// Pages supply a render(video) callback plus per-page lifecycle hooks for
// teardown and styling differences.

export interface CameraManagerOptions {
  video: HTMLVideoElement;
  startBtn: HTMLButtonElement;
  fullscreenBtn?: HTMLButtonElement | null;
  fullscreenTarget?: HTMLElement | null;
  startLabel?: string;
  stopLabel?: string;
  render: (video: HTMLVideoElement) => void;
  onStart?: () => void;
  onStop?: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

export interface CameraController {
  isRunning: () => boolean;
  isFullscreen: () => boolean;
  stop: () => void;
}

export function createCameraManager(opts: CameraManagerOptions): CameraController {
  const {
    video, startBtn, fullscreenBtn, fullscreenTarget,
    startLabel = 'Start Camera', stopLabel = 'Stop Camera',
    render,
    onStart = () => {}, onStop = () => {},
    onEnterFullscreen = () => {}, onExitFullscreen = () => {},
  } = opts;

  let stream: MediaStream | null = null;
  let rafId: number | null = null;
  let isFullscreen = false;

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
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please make sure you have granted camera permissions.');
    }
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    video.srcObject = null;
    startBtn.textContent = startLabel;
    onStop();
  }

  startBtn.addEventListener('click', () => {
    if (stream) stop(); else start();
  });

  if (fullscreenBtn && fullscreenTarget) {
    fullscreenBtn.addEventListener('click', async () => {
      if (!stream) await start();
      if (document.fullscreenElement) return;
      try {
        await fullscreenTarget.requestFullscreen();
        isFullscreen = true;
        onEnterFullscreen();
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isFullscreen) {
        isFullscreen = false;
        onExitFullscreen();
      }
    });
  }

  return {
    isRunning: () => stream !== null,
    isFullscreen: () => isFullscreen,
    stop,
  };
}
