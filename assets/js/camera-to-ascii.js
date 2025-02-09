document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const widthInput = document.getElementById('width-input');
    const widthValue = document.getElementById('width-value');
    const startBtn = document.getElementById('start-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const asciiOutput = document.getElementById('ascii-output');
    const asciiContainer = document.querySelector('.ascii-container');
    
    let isFullscreen = false;

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
            let width = parseInt(widthInput.value);
            let fontSize = 7;

            if (isFullscreen) {
                // Calculate optimal width and font size to fill screen
                const charAspectRatio = 0.5; // Approximate width/height ratio of a character
                width = Math.floor(window.innerWidth / 7); // Initial width estimate
                fontSize = Math.floor(window.innerHeight / (width * charAspectRatio)); // Calculate font size
                
                // Adjust width if needed to fill height
                if (fontSize * width * charAspectRatio < window.innerHeight) {
                    width = Math.floor(window.innerHeight / (fontSize * charAspectRatio));
                }
            }

            const height = calculateHeight(width, video.videoWidth, video.videoHeight);

            canvas.width = width;
            canvas.height = height;

            // Apply horizontal flip transformation
            ctx.scale(-1, 1);
            ctx.translate(-width, 0);

            // Draw and process the video frame
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const ascii = convertToAscii(imageData, width, height);

            // Reset transformation
            ctx.setTransform(1, 0, 0, 1, 0, 0);

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

    fullscreenBtn.addEventListener('click', async () => {
        if (!stream) {
            await startCamera();
        }
        
        if (!document.fullscreenElement) {
            try {
                await asciiOutput.requestFullscreen();
                isFullscreen = true;
                asciiOutput.style.backgroundColor = '#000';
                asciiOutput.style.margin = '0';
                asciiOutput.style.padding = '0';
                asciiOutput.style.width = '100vw';
                asciiOutput.style.height = '100vh';
                asciiOutput.style.display = 'flex';
                asciiOutput.style.alignItems = 'center';
                asciiOutput.style.justifyContent = 'center';
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            isFullscreen = false;
            asciiOutput.style.backgroundColor = '';
            asciiOutput.style.margin = '';
            asciiOutput.style.padding = '';
            widthInput.value = '125';
            widthValue.textContent = '125';
        }
    });
});