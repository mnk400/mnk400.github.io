document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const widthInput = document.getElementById('width-input');
    const widthValue = document.getElementById('width-value');
    const startBtn = document.getElementById('start-btn');
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

    let stream = null;
    let animationFrameId = null;

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
            startBtn.textContent = 'Stop Camera';
            startASCIIConversion();
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please make sure you have granted camera permissions.');
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        video.srcObject = null;
        asciiOutput.textContent = '';
        startBtn.textContent = 'Start Camera';
    }

    function startASCIIConversion() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        function convert() {
            const width = parseInt(widthInput.value);
            const fontSize = 7;

            const height = calculateHeight(width, video.videoWidth, video.videoHeight);

            canvas.width = width;
            canvas.height = height;

            // Draw and process the video frame
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const ascii = convertToAscii(imageData, width, height);

            // Update the output
            asciiOutput.style.fontSize = `${fontSize}px`;
            asciiOutput.textContent = ascii;

            // Continue the animation loop
            animationFrameId = requestAnimationFrame(convert);
        }

        convert();
    }

    startBtn.addEventListener('click', () => {
        if (!stream) {
            startCamera();
        } else {
            stopCamera();
        }
    });
});