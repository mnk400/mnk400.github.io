// Circles mode: each grid cell becomes a dot tinted with that cell's own
// sampled colour. Brightness drives both radius (dots touch at full bright)
// and opacity, giving a halftone-ish depth instead of flat monochrome dots.

import { sampleFrame } from './sampler.ts';
import type { CameraMode, RenderContext } from './types.ts';

const MIN_COLS = 10;
const MAX_COLS = 100;

export const circlesMode: CameraMode = {
  id: 'circles',
  label: 'Circles',
  render({ ctx, video, width, height, detail }: RenderContext) {
    if (!video.videoWidth) return;

    const cols = Math.round(MIN_COLS + (detail / 100) * (MAX_COLS - MIN_COLS));
    const cell = width / cols;
    const rows = Math.max(1, Math.round(height / cell));
    const maxRadius = cell / 2;

    const { data } = sampleFrame(video, cols, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness < 8) continue;

        const t = brightness / 255;
        ctx.globalAlpha = 0.4 + 0.6 * t;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, t * maxRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};
