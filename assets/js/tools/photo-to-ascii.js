document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const imageSelector = document.getElementById('image-selector');
    const widthInput = document.getElementById('width-input');
    const convertBtn = document.getElementById('convert-btn');
    const asciiOutput = document.getElementById('ascii-output');
    const downloadBtn = document.getElementById('download-btn');

    // Calculate the optimal font size to fit the container width
    function calculateOptimalFontSize(containerWidth, charWidth) {
        const availableWidth = containerWidth
        return Math.floor(availableWidth / charWidth * 1.8);
    }



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

        // Show the download button
        downloadBtn.style.display = 'inline-block';
    });

    downloadBtn.addEventListener('click', () => {
        if (!asciiOutput.textContent) {
            alert('Please convert an image to ASCII first!');
            return;
        }

        // Create a canvas for the ASCII art image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set up font properties
        const fontSize = 12;
        const fontFamily = 'Courier New, monospace';
        ctx.font = `${fontSize}px ${fontFamily}`;

        // Calculate canvas dimensions based on ASCII content
        const lines = asciiOutput.textContent.split('\n');
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const lineHeight = fontSize * 1.2;
        const borderSize = 20;

        const contentWidth = maxLineLength * fontSize * 0.6;
        const contentHeight = lines.length * lineHeight;

        canvas.width = contentWidth + (borderSize * 2);
        canvas.height = contentHeight + (borderSize * 2);

        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        // Set black text
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        // Draw each line of ASCII art (offset by border)
        lines.forEach((line, index) => {
            ctx.fillText(line, borderSize, borderSize + (index * lineHeight));
        });

        // Create download link
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ascii-art.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });
});
