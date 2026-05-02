// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

/**
 * Converts image data to ASCII art
 * @param {ImageData} imageData - The image data to convert
 * @param {number} width - The desired width in characters
 * @param {number} height - The desired height in characters
 * @returns {string} The ASCII art string
 */
function convertToAscii(imageData, width, height) {
    const pixels = imageData.data;
    let ascii = '';
    
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const idx = (i * width + j) * 4;
            const avg = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
            const charIdx = Math.floor(avg / 255 * (ASCII_CHARS.length - 1));
            ascii += ASCII_CHARS[charIdx];
        }
        ascii += '\n';
    }
    
    return ascii;
}

/**
 * Calculates the appropriate height maintaining aspect ratio
 * @param {number} width - The desired width in characters
 * @param {number} sourceWidth - The source image width
 * @param {number} sourceHeight - The source image height
 * @returns {number} The calculated height
 */
function calculateHeight(width, sourceWidth, sourceHeight) {
    const aspectRatio = sourceWidth / sourceHeight;
    return Math.floor(width / aspectRatio / 2); // Divide by 2 because characters are taller than wide
}

const _monoRatioCache = new Map();

function _measureMonoCharRatio(fontFamily) {
    if (_monoRatioCache.has(fontFamily)) return _monoRatioCache.get(fontFamily);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:200px';
    probe.style.fontFamily = fontFamily;
    probe.textContent = 'M'.repeat(100);
    document.body.appendChild(probe);
    const charWidth = probe.getBoundingClientRect().width / 100;
    document.body.removeChild(probe);
    const ratio = 200 / charWidth;
    _monoRatioCache.set(fontFamily, ratio);
    return ratio;
}

/**
 * Calculate the font size in px that lets `charCount` monospace characters
 * fit exactly across `containerWidth` px, measured against `target`'s actual
 * font stack rather than a fixed heuristic.
 */
function calculateOptimalFontSize(containerWidth, charCount, target) {
    const fontFamily = target ? getComputedStyle(target).fontFamily : 'monospace';
    const ratio = _measureMonoCharRatio(fontFamily);
    return containerWidth / charCount * ratio;
}
