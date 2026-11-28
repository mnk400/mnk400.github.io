// Shared frame sampler for camera modes: downsamples the live video to a
// cols×rows grid. One reused offscreen canvas keeps per-frame allocation out
// of the hot loop.

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export interface SampleOptions {
  /** Width / height of the box the grid fills. The frame is cropped to it,
   * centred, the way `object-fit: cover` crops the video beneath. */
  aspect: number;
  /** Flip horizontally, so a selfie camera reads like a mirror. */
  mirror: boolean;
}

export function sampleFrame(video: HTMLVideoElement, cols: number, rows: number, opts: SampleOptions): ImageData {
  if (!canvas) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }
  const c = ctx!;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sw = vw;
  let sh = vh;
  if (vw / vh > opts.aspect) sw = vh * opts.aspect;
  else sh = vw / opts.aspect;

  canvas.width = cols;
  canvas.height = rows;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cols, rows);
  if (opts.mirror) {
    c.translate(cols, 0);
    c.scale(-1, 1);
  }
  c.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, cols, rows);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return c.getImageData(0, 0, cols, rows);
}
