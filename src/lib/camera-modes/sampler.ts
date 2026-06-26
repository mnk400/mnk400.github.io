// Shared frame sampler for camera modes: downsamples the live video to a
// cols×rows grid and mirrors it horizontally so the feed reads as a selfie.
// One reused offscreen canvas keeps per-frame allocation out of the hot loop.

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export function sampleFrame(video: HTMLVideoElement, cols: number, rows: number): ImageData {
  if (!canvas) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }
  const c = ctx!;
  canvas.width = cols;
  canvas.height = rows;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cols, rows);
  c.translate(cols, 0);
  c.scale(-1, 1);
  c.drawImage(video, 0, 0, cols, rows);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return c.getImageData(0, 0, cols, rows);
}
