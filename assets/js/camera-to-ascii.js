document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const widthInput = document.getElementById('width-input');
    const startBtn = document.getElementById('start-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const asciiOutput = document.getElementById('ascii-output');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    (window.innerWidth <= 768);

    // Hide fullscreen button on mobile devices
    if (isMobile) {
        fullscreenBtn.style.display = 'none';
    }

    let isFullscreen = false;



    let stream = null;
    let animationFrameId = null;

    // Calculate the optimal font size to fit the container width
    function calculateOptimalFontSize(containerWidth, charWidth) {
        const availableWidth = containerWidth
        return Math.floor(availableWidth / charWidth * 1.8);
    }

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
            
            // Get the container width for responsive sizing
            const containerWidth = asciiOutput.parentElement.clientWidth;
            
            // Calculate font size based on container width and character count
            let fontSize = calculateOptimalFontSize(containerWidth, width);
            
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

            // Update the output with responsive font size
            asciiOutput.style.fontSize = `${fontSize}px`;
            asciiOutput.style.width = '100%';
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
