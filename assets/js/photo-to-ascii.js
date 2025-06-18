document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const imageSelector = document.getElementById('image-selector');
    const widthInput = document.getElementById('width-input');
    const widthValue = document.getElementById('width-value');
    const convertBtn = document.getElementById('convert-btn');
    const asciiOutput = document.getElementById('ascii-output');

    // Calculate the optimal font size to fit the container width
    function calculateOptimalFontSize(containerWidth, charWidth) {
        const availableWidth = containerWidth
        return Math.floor(availableWidth / charWidth * 1.8);
    }

    // Update width value display when slider moves
    let updateTimeout;
    widthInput.addEventListener('input', () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
            widthValue.textContent = widthInput.value;
            
            // Recalculate font size when width changes if an image has been converted
            if (asciiOutput.textContent) {
                const width = parseInt(widthInput.value);
                const containerWidth = asciiOutput.parentElement.clientWidth;
                const fontSize = calculateOptimalFontSize(containerWidth, width);
                // asciiOutput.style.fontSize = `${fontSize}px`;
            }
        }, 10);
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                imageSelector.style.display = 'none';
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
        
        // Get the container width for responsive sizing
        const containerWidth = asciiOutput.parentElement.clientWidth;
        
        // Calculate font size based on container width and character count
        const fontSize = calculateOptimalFontSize(containerWidth, width);

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

        // Update the output with responsive font size
        asciiOutput.style.fontSize = `${fontSize}px`;
        asciiOutput.style.width = '100%';
        asciiOutput.style.maxWidth = '525px';
        asciiOutput.textContent = ascii;
    });
});
