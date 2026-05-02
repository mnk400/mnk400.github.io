// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

const ASCII_PALETTES = {
    classic: '@%#*+=-:.',
    blocks: '█▓▒░',
    minimal: '#-.'
};

const ASCII_DITHER_MODES = ['none', 'ordered', 'floyd'];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeAsciiOptions(options) {
    if (typeof options === 'string') {
        return {
            characters: options,
            dither: 'none'
        };
    }

    const normalized = options || {};
    const characters = normalized.characters || ASCII_CHARS;
    const dither = ASCII_DITHER_MODES.includes(normalized.dither) ? normalized.dither : 'none';

    return {
        characters,
        dither
    };
}

function pixelBrightness(pixels, idx) {
    const alpha = pixels[idx + 3] / 255;
    const r = pixels[idx] * alpha + 255 * (1 - alpha);
    const g = pixels[idx + 1] * alpha + 255 * (1 - alpha);
    const b = pixels[idx + 2] * alpha + 255 * (1 - alpha);

    return (r + g + b) / 3;
}

function brightnessToChar(value, chars) {
    const charIdx = Math.floor(clamp(value, 0, 255) / 255 * (chars.length - 1));
    return chars[charIdx];
}

function quantizeBrightness(value, levels) {
    if (levels <= 1) return { index: 0, value: 0 };

    const index = Math.round(clamp(value, 0, 255) / 255 * (levels - 1));
    return {
        index,
        value: index / (levels - 1) * 255
    };
}

function convertWithOrderedDither(pixels, width, height, chars) {
    const bayer = [
        0, 8, 2, 10,
        12, 4, 14, 6,
        3, 11, 1, 9,
        15, 7, 13, 5
    ];
    const step = chars.length > 1 ? 255 / (chars.length - 1) : 255;
    let ascii = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const threshold = (bayer[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * step;
            ascii += brightnessToChar(pixelBrightness(pixels, idx) + threshold, chars);
        }
        ascii += '\n';
    }

    return ascii;
}

function convertWithFloydDither(pixels, width, height, chars) {
    const values = new Array(width * height);
    let ascii = '';

    for (let i = 0; i < values.length; i++) {
        values[i] = pixelBrightness(pixels, i * 4);
    }

    function addError(x, y, amount) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        values[y * width + x] += amount;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const quantized = quantizeBrightness(values[idx], chars.length);
            const error = values[idx] - quantized.value;

            ascii += chars[quantized.index];

            addError(x + 1, y, error * 7 / 16);
            addError(x - 1, y + 1, error * 3 / 16);
            addError(x, y + 1, error * 5 / 16);
            addError(x + 1, y + 1, error * 1 / 16);
        }
        ascii += '\n';
    }

    return ascii;
}

/**
 * Converts image data to ASCII art
 * @param {ImageData} imageData - The image data to convert
 * @param {number} width - The desired width in characters
 * @param {number} height - The desired height in characters
 * @param {Object|string} [options] - Optional { characters, dither } or a character string
 * @returns {string} The ASCII art string
 */
function convertToAscii(imageData, width, height, options) {
    const pixels = imageData.data;
    const settings = normalizeAsciiOptions(options);
    const chars = Array.from(settings.characters || ASCII_CHARS);
    let ascii = '';

    if (!chars.length) return ascii;

    if (settings.dither === 'ordered') {
        return convertWithOrderedDither(pixels, width, height, chars);
    }

    if (settings.dither === 'floyd') {
        return convertWithFloydDither(pixels, width, height, chars);
    }
    
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const idx = (i * width + j) * 4;
            ascii += brightnessToChar(pixelBrightness(pixels, idx), chars);
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
