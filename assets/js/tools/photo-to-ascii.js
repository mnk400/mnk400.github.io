document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.querySelector('[data-image-upload]');
    const imagePreview = imageUpload ? imageUpload.querySelector('.image-upload__preview') : null;
    const widthInput = document.getElementById('width-input');
    const convertBtn = document.getElementById('convert-btn');
    const asciiOutput = document.getElementById('ascii-output');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const paletteToggle = document.getElementById('ascii-palette-toggle');
    const ditherToggle = document.getElementById('ascii-dither-toggle');

    function getActiveSwitchValue(id, fallback) {
        if (window.switchManager && window.switchManager[id]) {
            return window.switchManager[id].getActive() || fallback;
        }

        const active = document.querySelector(`#${id} .switch-option.active`);
        return active ? active.dataset.value || active.id : fallback;
    }

    function getAsciiOptions() {
        const palette = getActiveSwitchValue('ascii-palette-toggle', 'classic');
        const dither = getActiveSwitchValue('ascii-dither-toggle', 'none');

        return {
            characters: ASCII_PALETTES[palette] || ASCII_PALETTES.classic,
            dither
        };
    }

    function setActionVisibility(isVisible) {
        const display = isVisible ? 'inline-block' : 'none';
        copyBtn.style.display = display;
        downloadBtn.style.display = display;
    }

    function renderAscii(showMissingImageAlert) {
        if (!imagePreview.src) {
            if (showMissingImageAlert) {
                alert('Please select an image first!');
            }
            return;
        }

        const width = parseInt(widthInput.value);

        const containerWidth = asciiOutput.clientWidth - parseFloat(getComputedStyle(asciiOutput).paddingLeft) * 2;
        const fontSize = calculateOptimalFontSize(containerWidth, width, asciiOutput);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const height = calculateHeight(width, imagePreview.naturalWidth, imagePreview.naturalHeight);

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(imagePreview, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const ascii = convertToAscii(imageData, width, height, getAsciiOptions());

        asciiOutput.style.fontSize = `${fontSize}px`;
        asciiOutput.style.width = '100%';
        asciiOutput.style.maxWidth = '525px';
        asciiOutput.textContent = ascii;
        copyBtn.dataset.copy = ascii;
        setActionVisibility(true);
    }

    imageUpload.addEventListener('image-upload:change', () => {
        asciiOutput.textContent = '';
        setActionVisibility(false);
    });

    convertBtn.addEventListener('click', () => {
        renderAscii(true);
    });

    [paletteToggle, ditherToggle].forEach((toggle) => {
        if (!toggle) return;

        toggle.addEventListener('change', () => {
            if (asciiOutput.textContent) {
                renderAscii(false);
            }
        });
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
