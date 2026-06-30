// ASCII mode: brightness grid → monospace characters drawn onto the canvas.
// Drawn one fillText per row (monospace, uniform advance) so a full frame is
// ~rows draw calls, not cols×rows — cheap enough for the RAF loop.

import {
  ASCII_PALETTES,
  convertToAscii,
  type AsciiPalette,
  type DitherMode,
} from '../ascii-utils.ts';
import { sampleFrame } from './sampler.ts';
import type { CameraMode, RenderContext } from './types.ts';

const MIN_COLS = 15;
const MAX_COLS = 150;
const FONT = 'ui-monospace, "Courier New", monospace';

let charRatio = 0;

// Measure the monospace advance-to-fontSize ratio once (linear in font size).
function measureCharRatio(ctx: CanvasRenderingContext2D): number {
  if (!charRatio) {
    ctx.save();
    ctx.font = `100px ${FONT}`;
    charRatio = ctx.measureText('M').width / 100;
    ctx.restore();
  }
  return charRatio;
}

function textColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#222';
}

export const asciiMode: CameraMode = {
  id: 'ascii',
  label: 'ASCII',
  controls: [
    {
      id: 'dither',
      label: 'dither',
      default: 'none',
      options: [
        { value: 'none', label: 'Smooth' },
        { value: 'ordered', label: 'Ordered' },
        { value: 'floyd', label: 'Floyd' },
      ],
    },
    {
      id: 'palette',
      label: 'palette',
      default: 'classic',
      options: [
        { value: 'classic', label: 'Classic' },
        { value: 'blocks', label: 'Blocks' },
        { value: 'minimal', label: 'Minimal' },
      ],
    },
  ],
  render({ ctx, video, width, height, detail, options }: RenderContext) {
    if (!video.videoWidth) return;

    // Fill the box: font size makes `cols` chars span the full width, then
    // take as many rows as fit the height (stretching to the canvas aspect,
    // same as circles mode) so there's no letterboxing.
    const ratio = measureCharRatio(ctx);
    const cols = Math.round(MIN_COLS + (detail / 100) * (MAX_COLS - MIN_COLS));
    const fontSize = width / (cols * ratio);
    const rows = Math.max(1, Math.round(height / fontSize));
    const lineHeight = height / rows;

    const palette = (options.palette as AsciiPalette) in ASCII_PALETTES
      ? (options.palette as AsciiPalette)
      : 'classic';
    const dither = (options.dither as DitherMode) || 'none';

    const imageData = sampleFrame(video, cols, rows);
    const lines = convertToAscii(imageData, cols, rows, {
      characters: ASCII_PALETTES[palette],
      dither,
    }).split('\n');

    ctx.font = `${fontSize}px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor();
    for (let i = 0; i < rows; i++) {
      ctx.fillText(lines[i], 0, i * lineHeight);
    }
  },
};
