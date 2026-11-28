// ASCII mode: the photo converter's conversion and layout, live. Same cell
// shape and font, so a frame here looks like the same image there.

import {
  ASCII_PALETTES,
  calculateHeight,
  convertToAscii,
  drawAscii,
  isLightInk,
  type AsciiPalette,
  type DitherMode,
} from '../ascii-utils.ts';
import { sampleFrame } from './sampler.ts';
import type { CameraMode, RenderContext } from './types.ts';

const MIN_COLS = 15;
const MAX_COLS = 150;

// Light ink (dark themes) draws bright pixels dense, or the feed reads as a
// negative. Re-tested only when the theme's ink changes.
let lastInk = '';
let lightInk = false;

export const asciiMode: CameraMode = {
  id: 'ascii',
  label: 'ASCII',
  // Same order and labels as the photo converter.
  controls: [
    {
      id: 'palette',
      label: 'glyphs',
      default: 'classic',
      class: 'ascii-ramps',
      // Each ramp is labelled with its own glyphs, and named for screen readers.
      options: Object.entries(ASCII_PALETTES).map(([value, label]) => ({ value, label, ariaLabel: value })),
    },
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
  ],
  render({ ctx, video, width, height, detail, mirror, options }: RenderContext) {
    if (!video.videoWidth) return;

    const cols = Math.round(MIN_COLS + (detail / 100) * (MAX_COLS - MIN_COLS));
    const rows = Math.max(1, calculateHeight(cols, width, height));
    const palette = (options.palette as AsciiPalette) in ASCII_PALETTES
      ? (options.palette as AsciiPalette)
      : 'classic';
    const dither = (options.dither as DitherMode) || 'none';

    const root = getComputedStyle(document.documentElement);
    const ink = root.getPropertyValue('--text-color').trim() || '#222';
    if (ink !== lastInk) [lastInk, lightInk] = [ink, isLightInk(ink)];

    const text = convertToAscii(sampleFrame(video, cols, rows, { aspect: width / height, mirror }), cols, rows, {
      characters: ASCII_PALETTES[palette],
      dither,
      invert: lightInk,
    });
    drawAscii(ctx, text, cols, { x: 0, y: 0, width, height }, {
      fontFamily: root.getPropertyValue('--font-mono').trim() || 'monospace',
      ink,
    });
  },
};
