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

        const height = calculateHeight(width, imagePreview.naturalWidth, imagePreview.naturalHeight);

        canvas.width = width;
        canvas.height = height;

        // Draw and process the image
        ctx.drawImage(imagePreview, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const ascii = convertToAscii(imageData, width, height);

        // Update the output
        asciiOutput.style.fontSize = `${fontSize}px`;
        asciiOutput.textContent = ascii;
    });
});