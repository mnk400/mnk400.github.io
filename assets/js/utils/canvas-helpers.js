/**
 * Canvas Helpers - Common canvas operations and utilities
 * Used across games and graphics tools
 */

export const CanvasUtils = {
    /**
     * Setup canvas with proper sizing and context
     */
    setupCanvas(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        
        // Set default options
        const defaults = {
            width: canvas.width,
            height: canvas.height,
            imageSmoothingEnabled: false
        };
        
        const config = { ...defaults, ...options };
        
        canvas.width = config.width;
        canvas.height = config.height;
        ctx.imageSmoothingEnabled = config.imageSmoothingEnabled;
        
        return ctx;
    },

    /**
     * Clear entire canvas
     */
    clearCanvas(canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * Fill canvas with solid color
     */
    fillCanvas(ctx, color, width, height) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    },

    /**
     * Draw a pixel at specific coordinates
     */
    drawPixel(ctx, x, y, color, size = 1) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
    },

    /**
     * Get pixel data from canvas
     */
    getPixelData(ctx, x, y, width, height) {
        return ctx.getImageData(x, y, width, height);
    },

    /**
     * Put pixel data to canvas
     */
    putPixelData(ctx, imageData, x, y) {
        ctx.putImageData(imageData, x, y);
    },

    /**
     * Resize canvas maintaining aspect ratio
     */
    resizeCanvas(canvas, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        canvas.style.width = (canvas.width * ratio) + 'px';
        canvas.style.height = (canvas.height * ratio) + 'px';
    }
};

// Non-module version for legacy compatibility
if (typeof module === 'undefined') {
    window.CanvasUtils = CanvasUtils;
}