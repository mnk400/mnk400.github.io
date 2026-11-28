/** Saves a blob as a file. The URL outlives the click: revoked at once,
 * Safari can cancel the download before it starts. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A canvas as a PNG on the given ground, so transparent pixels don't save as
 * a checkerboard (or black) wherever it's opened. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, ground: string) {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  out.toBlob((blob) => { if (blob) downloadBlob(blob, filename); });
}
