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
}

export interface CameraMode {
  id: string;           // stable id, also the SelectionSwitch value
  label: string;        // shown in the mode toggle
  render(ctx: RenderContext): void;
}
