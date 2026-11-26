// Shared lifecycle for getUserMedia tools: start/stop the stream, drive a
// render loop per RAF, and (optionally) toggle a fullscreen container.
// Pages supply a render(video) callback plus per-page lifecycle hooks for
// styling differences. The stream and its listeners release on swap.

import { pageSignal, untilSwap } from './lifecycle.ts';

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
  let disposed = false;

  function loop() {
    render(video);
    rafId = requestAnimationFrame(loop);
  }

  async function start() {
    try {
      const granted = await navigator.mediaDevices.getUserMedia({ video: true });
      // The permission prompt can outlive the page; release a late grant.
      if (disposed) {
        granted.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = granted;
      video.srcObject = stream;
      await video.play();
      if (disposed) return;
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
    }, { signal: pageSignal() });
  }

  untilSwap(() => {
    disposed = true;
    if (stream) stop();
  });

  return {
    isRunning: () => stream !== null,
    isFullscreen: () => isFullscreen,
    stop,
  };
}
