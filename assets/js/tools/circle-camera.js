document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas-output');
    const ctx = canvas.getContext('2d');
    const resolutionInput = document.getElementById('resolution-input');
    const resolutionValue = document.getElementById('resolution-value');
    const startBtn = document.getElementById('start-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    if (DeviceDetect.isMobileDevice()) {
        fullscreenBtn.style.display = 'none';
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let cachedFillStyle = CanvasUtils.css('--contrast-overlay-hover');
    CanvasUtils.onThemeChange(() => {
        cachedFillStyle = CanvasUtils.css('--contrast-overlay-hover');
    });

    function updateCanvasSize() {
        const containerWidth = canvas.parentElement.clientWidth;
        canvas.width = containerWidth;
        canvas.height = containerWidth; // square aspect
    }

    const camera = CameraManager.create({
        video,
        startBtn,
        fullscreenBtn,
        fullscreenTarget: canvas,
        render: renderFrame,
        onStart() {
            updateCanvasSize();
            canvas.style.backgroundColor = 'transparent';
        },
        onStop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.backgroundColor = CanvasUtils.css('--translucent-medium');
        },
        onEnterFullscreen() {
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.margin = '0';
            canvas.style.padding = '0';
        },
        onExitFullscreen() {
            updateCanvasSize();
            resolutionInput.value = '40';
            if (resolutionValue) resolutionValue.textContent = '40';
        },
    });

    window.addEventListener('resize', () => {
        if (!camera.isFullscreen()) updateCanvasSize();
    });

    function renderFrame(video) {
        const resolution = parseInt(resolutionInput.value);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cellWidth = canvas.width / resolution;
        const cellHeight = canvas.height / resolution;

        tempCanvas.width = resolution;
        tempCanvas.height = Math.floor(resolution * (canvas.height / canvas.width));

        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.setTransform(1, 0, 0, 1, 0, 0);

        const pixels = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        ctx.fillStyle = cachedFillStyle;

        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const idx = (y * tempCanvas.width + x) * 4;
                const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                if (brightness === 0) continue;

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
});
