document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');
    const resolutionInput = document.getElementById('resolution-input');
    const resolutionValue = document.getElementById('resolution-value');
    const startBtn = document.getElementById('start-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    (window.innerWidth <= 768);

    if (isMobile) {
        fullscreenBtn.style.display = 'none';
    }

    // Function to get CSS variable value
    function getCSSVariable(variableName) {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }

    let isFullscreen = false;

    let updateTimeout;
    resolutionInput.addEventListener('input', () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
            resolutionValue.textContent = resolutionInput.value;
        }, 10);
    });

    let stream = null;
    let animationFrameId = null;

    // Set initial canvas size
    function updateCanvasSize() {
        const containerWidth = canvas.parentElement.clientWidth;
        const aspectRatio = 1; // Modern widescreen aspect ratio
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
    }

    // Update canvas size when window resizes
    window.addEventListener('resize', () => {
        if (!isFullscreen) {
            updateCanvasSize();
        }
    });

    async function startCamera() {
        try {
            updateCanvasSize();
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
            startBtn.textContent = 'Stop Camera';
            
            canvas.style.backgroundColor = 'transparent';
            
            startCircleConversion();
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        canvas.style.backgroundColor = getCSSVariable(`--mid-translucent`);
        
        startBtn.textContent = 'Start Camera';
    }

    function startCircleConversion() {
        function convert() {
            const resolution = parseInt(resolutionInput.value);
            
            // Clear canvas with transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const cellWidth = canvas.width / resolution;
            const cellHeight = canvas.height / resolution;
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = resolution;
            tempCanvas.height = Math.floor(resolution * (canvas.height / canvas.width));
            
            tempCtx.translate(tempCanvas.width, 0);
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.setTransform(1, 0, 0, 1, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const pixels = imageData.data;
            
            ctx.fillStyle = getCSSVariable('--black-accent-hover');
            
            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const idx = (y * tempCanvas.width + x) * 4;
                    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                    
                    if (brightness > 0) {
                        const maxRadius = Math.min(cellWidth, cellHeight) / 2;
                        const radius = (brightness / 255) * maxRadius;
                        
                        const centerX = x * cellWidth + cellWidth / 2;
                        const centerY = y * cellHeight + cellHeight / 2;
                        
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            
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
                await canvas.requestFullscreen();
                isFullscreen = true;
                
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.margin = '0';
                canvas.style.padding = '0';
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            isFullscreen = false;
            updateCanvasSize();
            resolutionInput.value = '40';
            resolutionValue.textContent = '40';
        }
    });
});