// A camera mode is one way of painting a webcam frame onto the shared canvas.
// The page owns the canvas + lifecycle; each mode only implements render().
// Adding a new visual style = add a file here and register it in index.ts.

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  video: HTMLVideoElement;
  width: number;        // canvas width in CSS pixels (ctx is DPR-scaled)
  height: number;       // canvas height in CSS pixels
  detail: number;       // 0–100 from the Detail slider
  fullscreen: boolean;
  options: Record<string, string>; // selected values of this mode's controls, keyed by control id
}

// A sub-control a mode exposes (rendered as a SelectionSwitch under the mode
// toggle, shown only while that mode is active). The selected value lands in
// RenderContext.options under `id`.
export interface ModeControl {
  id: string;           // option key, e.g. 'dither'
  label: string;        // field label shown above the switch
  default: string;      // initial value (must be one of options below)
  options: { value: string; label: string }[];
}

export interface CameraMode {
  id: string;           // stable id, also the SelectionSwitch value
  label: string;        // shown in the mode toggle
  controls?: ModeControl[]; // optional per-mode sub-options
  render(ctx: RenderContext): void;
}
