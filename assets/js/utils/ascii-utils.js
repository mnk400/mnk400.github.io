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

/**
 * Calculate the font size in px that lets `charCount` monospace characters
 * fit across `containerWidth` px. The 1.8 factor approximates the typical
 * width-to-font-size ratio of monospace glyphs in this site's stack.
 */
function calculateOptimalFontSize(containerWidth, charCount) {
    return Math.floor(containerWidth / charCount * 1.8);
}
