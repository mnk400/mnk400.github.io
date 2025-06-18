document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const imageSelector = document.getElementById('image-selector');
    const colorsInput = document.getElementById('colors-input');
    const colorsValue = document.getElementById('colors-value');
    const extractBtn = document.getElementById('extract-btn');
    const paletteOutput = document.getElementById('palette-output');
    const colorInfo = document.getElementById('color-info');
    
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    
    colorsInput.addEventListener('input', function() {
        colorsValue.textContent = this.value;
    });

    imageInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                imageSelector.style.display = 'none';
                paletteOutput.innerHTML = '';
                // Don't clear the HTML structure, just hide it
                colorInfo.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    extractBtn.addEventListener('click', () => {
        if (!imagePreview.src || imagePreview.src === window.location.href) {
            alert('Please select an image first!');
            return;
        }

        const numColors = parseInt(colorsInput.value);
        extractColorPalette(imagePreview, numColors);
    });

    /**
     * Converts RGB color to Oklab color space
     * Oklab is a perceptually uniform color space that better represents human perception
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @returns {Object} Oklab color representation {L, a, b}
     */
    function rgbToOklab(r, g, b) {
        // Normalize RGB values to 0-1
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        // Convert sRGB to linear RGB
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        // Convert linear RGB to XYZ
        const x = 0.4124 * r + 0.3576 * g + 0.1805 * b;
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
        
        // Convert XYZ to Oklab
        const l = Math.cbrt(0.8189 * x + 0.3618 * y - 0.1288 * z);
        const m = Math.cbrt(0.0329 * x + 0.9293 * y + 0.0361 * z);
        const s = Math.cbrt(0.0482 * x + 0.2621 * y + 0.6671 * z);
        
        return {
            L: 0.2104 * l + 0.7936 * m - 0.0040 * s,
            a: 1.9779 * l - 2.4285 * m + 0.4506 * s,
            b: 0.0259 * l + 0.7827 * m - 0.8086 * s
        };
    }

    /**
     * Converts Oklab color back to RGB
     * @param {Object} oklab - Oklab color {L, a, b}
     * @returns {Object} RGB color {r, g, b} with values 0-255
     */
    function oklabToRgb(oklab) {
        const { L, a, b: bVal } = oklab;
        
        // Convert Oklab to LMS
        const l = L + 0.3963377774 * a + 0.2158037573 * bVal;
        const m = L - 0.1055613458 * a - 0.0638541728 * bVal;
        const s = L - 0.0894841775 * a - 1.2914855480 * bVal;
        
        // Convert LMS to XYZ
        const l_ = l * l * l;
        const m_ = m * m * m;
        const s_ = s * s * s;
        
        const x = 1.2270138511 * l_ - 0.5577999807 * m_ + 0.2812561490 * s_;
        const y = -0.0405801784 * l_ + 1.1122568696 * m_ - 0.0716766787 * s_;
        const z = -0.0763812845 * l_ - 0.4214819784 * m_ + 1.5861632204 * s_;
        
        // Convert XYZ to linear RGB
        let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
        let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
        let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
        
        // Convert linear RGB to sRGB
        r = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
        g = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
        b = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1 / 2.4) - 0.055;
        
        // Clamp and convert to 0-255
        return {
            r: Math.max(0, Math.min(255, Math.round(r * 255))),
            g: Math.max(0, Math.min(255, Math.round(g * 255))),
            b: Math.max(0, Math.min(255, Math.round(b * 255)))
        };
    }

    /**
     * Calculate Euclidean distance between two points in Oklab space
     * @param {Object} p1 - First point {L, a, b}
     * @param {Object} p2 - Second point {L, a, b}
     * @param {number} lightnessWeight - Weight for the lightness component (0-1)
     * @returns {number} Distance between points
     */
    function oklabDistance(p1, p2, lightnessWeight = 0.5) {
        // Apply lightness weight to reduce the influence of brightness
        const l1 = p1.L * lightnessWeight;
        const l2 = p2.L * lightnessWeight;
        
        const dl = l1 - l2;
        const da = p1.a - p2.a;
        const db = p1.b - p2.b;
        
        return Math.sqrt(dl * dl + da * da + db * db);
    }

    /**
     * K-means clustering algorithm for color quantization
     * @param {Array} pixels - Array of pixel data in Oklab format
     * @param {number} k - Number of clusters/colors to extract
     * @param {number} maxIterations - Maximum number of iterations
     * @param {number} lightnessWeight - Weight for the lightness component (0-1)
     * @returns {Array} Array of centroids representing the color palette
     */
    function kMeansClustering(pixels, k, maxIterations = 20, lightnessWeight = 0.5) {
        if (pixels.length <= k) {
            return pixels; // Not enough pixels for clustering
        }
        
        // Initialize centroids using k-means++ method
        const centroids = [pixels[Math.floor(Math.random() * pixels.length)]];
        
        // Select initial centroids with k-means++ initialization
        for (let i = 1; i < k; i++) {
            // Calculate distances from points to the nearest centroid
            const distances = pixels.map(pixel => {
                return Math.min(...centroids.map(centroid => 
                    oklabDistance(pixel, centroid, lightnessWeight)
                ));
            });
            
            // Calculate sum of squared distances
            const distanceSum = distances.reduce((sum, dist) => sum + dist * dist, 0);
            
            // Choose next centroid with probability proportional to distance squared
            let random = Math.random() * distanceSum;
            let index = 0;
            for (let j = 0; j < distances.length; j++) {
                random -= distances[j] * distances[j];
                if (random <= 0) {
                    index = j;
                    break;
                }
            }
            
            centroids.push(pixels[index]);
        }
        
        // Perform k-means clustering
        let iterations = 0;
        let changed = true;
        let clusters = new Array(k).fill().map(() => []);
        
        while (changed && iterations < maxIterations) {
            // Reset clusters
            clusters = new Array(k).fill().map(() => []);
            
            // Assign each pixel to the nearest centroid
            for (const pixel of pixels) {
                let minDist = Infinity;
                let clusterIndex = 0;
                
                for (let i = 0; i < centroids.length; i++) {
                    const dist = oklabDistance(pixel, centroids[i], lightnessWeight);
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIndex = i;
                    }
                }
                
                clusters[clusterIndex].push(pixel);
            }
            
            // Update centroids
            changed = false;
            for (let i = 0; i < k; i++) {
                if (clusters[i].length === 0) continue;
                
                // Calculate new centroid as average of cluster points
                const newCentroid = {
                    L: 0,
                    a: 0,
                    b: 0,
                    count: clusters[i].length
                };
                
                for (const pixel of clusters[i]) {
                    newCentroid.L += pixel.L;
                    newCentroid.a += pixel.a;
                    newCentroid.b += pixel.b;
                }
                
                newCentroid.L /= clusters[i].length;
                newCentroid.a /= clusters[i].length;
                newCentroid.b /= clusters[i].length;
                
                // Check if centroid changed significantly
                if (oklabDistance(newCentroid, centroids[i], lightnessWeight) > 0.001) {
                    changed = true;
                }
                
                centroids[i] = newCentroid;
            }
            
            iterations++;
        }
        
        // Sort centroids by cluster size (frequency)
        return centroids.sort((a, b) => (b.count || 0) - (a.count || 0));
    }

    /**
     * Extract color palette from image using K-means clustering
     * @param {HTMLImageElement} image - Image element
     * @param {number} numColors - Number of colors to extract
     */
    function extractColorPalette(image, numColors) {
        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        
        // Draw image on canvas
        ctx.drawImage(image, 0, 0);
        
        try {
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Sample pixels for performance (adjust sampling rate based on image size)
            const totalPixels = pixels.length / 4;
            const samplingFactor = Math.min(1, Math.max(0.05, 10000 / totalPixels));
            const samplingStep = Math.max(1, Math.floor(1 / samplingFactor));
            
            // Convert sampled pixels to Oklab color space
            const oklabPixels = [];
            const uniqueColors = new Set();
            
            for (let i = 0; i < pixels.length; i += 4 * samplingStep) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                // Skip transparent pixels
                if (a < 128) continue;
                
                // Create a color key to track unique colors
                const colorKey = `${r},${g},${b}`;
                if (!uniqueColors.has(colorKey)) {
                    uniqueColors.add(colorKey);
                    
                    // Convert to Oklab
                    const oklab = rgbToOklab(r, g, b);
                    oklab.originalRgb = { r, g, b };
                    oklabPixels.push(oklab);
                }
            }
            
            // Apply k-means clustering with lightness weight
            const lightnessWeight = 0.325;
            const palette = kMeansClustering(oklabPixels, numColors, 30, lightnessWeight);
            
            // Convert palette back to RGB
            const rgbPalette = palette.map(color => {
                const rgb = oklabToRgb(color);
                return {
                    r: rgb.r,
                    g: rgb.g,
                    b: rgb.b,
                    count: color.count || 0
                };
            });
            
            // Display the palette
            displayPalette(rgbPalette);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. This might be due to CORS restrictions if the image is from another domain.');
        }
    }

    // Function to display the extracted palette
    function displayPalette(colors) {
        paletteOutput.innerHTML = '';
        colorInfo.style.display = 'none';
        
        if (colors.length === 0) {
            const errorTemplate = document.getElementById('error-template');
            if (errorTemplate) {
                paletteOutput.appendChild(errorTemplate.content.cloneNode(true));
            } else {
                paletteOutput.innerHTML = '<p>No colors could be extracted from this image.</p>';
            }
            return;
        }
        
        const swatchTemplate = document.getElementById('color-swatch-template');
        
        // Create color swatches
        colors.forEach((color, index) => {
            const { r, g, b } = color;
            const hexColor = rgbToHex(r, g, b);
            
            // Clone the template
            if (swatchTemplate) {
                const swatch = swatchTemplate.content.cloneNode(true).querySelector('.color-swatch');
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                swatch.dataset.color = hexColor;
                swatch.dataset.index = index;
                
                // Add click event to show color details
                swatch.addEventListener('click', () => {
                    showColorDetails(r, g, b, hexColor, index);
                });
                
                paletteOutput.appendChild(swatch);
            } else {
                // Fallback if template is not available
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                swatch.dataset.color = hexColor;
                swatch.dataset.index = index;
                
                swatch.addEventListener('click', () => {
                    showColorDetails(r, g, b, hexColor, index);
                });
                
                paletteOutput.appendChild(swatch);
            }
        });
        
        // Show details for the first color by default
        if (colors.length > 0) {
            const firstColor = colors[0];
            showColorDetails(firstColor.r, firstColor.g, firstColor.b, rgbToHex(firstColor.r, firstColor.g, firstColor.b), 0);
        }
    }

    function showColorDetails(r, g, b, hex, index) {
        // Show the color info section
        colorInfo.style.display = 'block';
        
        // Highlight the selected swatch
        const swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.classList.remove('selected');
            if (parseInt(swatch.dataset.index) === index) {
                swatch.classList.add('selected');
            }
        });
        
        // Update color preview
        const colorPreview = document.getElementById('color-preview');
        if (colorPreview) {
            colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }
        
        // Update color values
        const hexValue = document.getElementById('hex-value');
        const rgbValue = document.getElementById('rgb-value');
        const hslValue = document.getElementById('hsl-value');
        const hslString = rgbToHsl(r, g, b);
        
        if (hexValue) hexValue.textContent = hex;
        if (rgbValue) rgbValue.textContent = `rgb(${r}, ${g}, ${b})`;
        if (hslValue) hslValue.textContent = hslString;
        
        // Update copy buttons
        const copyButtons = document.querySelectorAll('.copy-btn');
        copyButtons.forEach(btn => {
            const type = btn.dataset.type;
            if (type === 'hex') {
                btn.dataset.value = hex;
            } else if (type === 'rgb') {
                btn.dataset.value = `rgb(${r}, ${g}, ${b})`;
            } else if (type === 'hsl') {
                btn.dataset.value = hslString;
            }
            
            // Remove existing event listeners to prevent duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add click event for copying
            newBtn.addEventListener('click', function() {
                const textToCopy = this.dataset.value;
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        const originalText = this.textContent;
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                            this.textContent = originalText;
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                    });
            });
        });
    }

    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
});
