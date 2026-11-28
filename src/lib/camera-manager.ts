// Shared lifecycle for getUserMedia tools: open and close the stream and drive
// a render loop per frame. The page owns every control and message; failures
// come back as the rejected start(). The stream releases on swap.

import { untilSwap } from './lifecycle.ts';

export interface CameraManagerOptions {
  video: HTMLVideoElement;
  render: (video: HTMLVideoElement) => void;
  /** The new track, before its first frame renders. */
  onTrack?: (track: MediaStreamTrack) => void;
}

export interface CameraController {
  /**
   * Opens a camera (the selfie one by default) or switches to `deviceId`.
   * Resolves true once live, false if a later start or stop overtook it.
   */
  start: (deviceId?: string) => Promise<boolean>;
  stop: () => void;
  isRunning: () => boolean;
  track: () => MediaStreamTrack | null;
}

export function createCameraManager({ video, render, onTrack }: CameraManagerOptions): CameraController {
  let stream: MediaStream | null = null;
  let rafId: number | null = null;
  // Bumped by every start and stop: an older start that resolves late is stale.
  let generation = 0;

  function loop() {
    render(video);
    rafId = requestAnimationFrame(loop);
  }

  function release() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    video.srcObject = null;
  }

  async function start(deviceId?: string) {
    const mine = ++generation;
    // Many phones can't hold two cameras open, so the old one closes first.
    release();
    let granted: MediaStream;
    try {
      granted = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
      });
    } catch (err) {
      if (mine !== generation) return false;
      throw err;
    }
    // Overtaken (or the page left) while the prompt was up: let this one go.
    if (mine !== generation) {
      granted.getTracks().forEach((t) => t.stop());
      return false;
    }
    stream = granted;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (err) {
      // A newer srcObject aborts this play(); that's the newer start's business.
      if (mine !== generation) return false;
      release();
      throw err;
    }
    if (mine !== generation) return false;
    onTrack?.(stream.getVideoTracks()[0]);
    loop();
    return true;
  }

  function stop() {
    generation++;
    release();
  }

  untilSwap(stop);

  return {
    start,
    stop,
    isRunning: () => stream !== null,
    track: () => stream?.getVideoTracks()[0] ?? null,
  };
}
