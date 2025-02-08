document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const widthInput = document.getElementById('width-input');
    const widthValue = document.getElementById('width-value');
    const convertBtn = document.getElementById('convert-btn');
    const asciiOutput = document.getElementById('ascii-output');

    // Update width value display when slider moves
    let updateTimeout;
    widthInput.addEventListener('input', () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
            widthValue.textContent = widthInput.value;
        }, 10);
    });

    // ASCII characters from dark to light
    const ASCII_CHARS = '@%#*+=-:. ';

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    convertBtn.addEventListener('click', () => {
        if (!imagePreview.src) {
            alert('Please select an image first!');
            return;
        }

        const width = parseInt(widthInput.value);
        const fontSize = 7;

        // Create a canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate height maintaining aspect ratio
        const aspectRatio = imagePreview.naturalWidth / imagePreview.naturalHeight;
        const height = Math.floor(width / aspectRatio / 2); // Divide by 2 because characters are taller than wide

        canvas.width = width;
        canvas.height = height;

        // Draw and process the image
        ctx.drawImage(imagePreview, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
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

        // Update the output
        asciiOutput.style.fontSize = `${fontSize}px`;
        asciiOutput.textContent = ascii;
    });
});