document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const widthInput = document.getElementById('width-input');
    const widthValue = document.getElementById('width-value');
    const startBtn = document.getElementById('start-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const asciiOutput = document.getElementById('ascii-output');

    if (DeviceDetect.isMobileDevice()) {
        fullscreenBtn.style.display = 'none';
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const camera = CameraManager.create({
        video,
        startBtn,
        fullscreenBtn,
        fullscreenTarget: asciiOutput,
        render: renderFrame,
        onStop() {
            asciiOutput.textContent = '';
        },
        onEnterFullscreen() {
            asciiOutput.style.backgroundColor = '#000';
            asciiOutput.style.margin = '0';
            asciiOutput.style.padding = '0';
            asciiOutput.style.width = '100vw';
            asciiOutput.style.height = '100vh';
            asciiOutput.style.display = 'flex';
            asciiOutput.style.alignItems = 'center';
            asciiOutput.style.justifyContent = 'center';
        },
        onExitFullscreen() {
            asciiOutput.style.backgroundColor = '';
            asciiOutput.style.margin = '';
            asciiOutput.style.padding = '';
            widthInput.value = '125';
            if (widthValue) widthValue.textContent = '125';
        },
    });

    function renderFrame(video) {
        let width = parseInt(widthInput.value);
        const containerWidth = asciiOutput.clientWidth - parseFloat(getComputedStyle(asciiOutput).paddingLeft) * 2;
        let fontSize = calculateOptimalFontSize(containerWidth, width, asciiOutput);

        if (camera.isFullscreen()) {
            // Fill the screen: pick a width estimate then derive font size,
            // then back-compute width if rounding leaves vertical slack.
            const charAspectRatio = 0.5;
            width = Math.floor(window.innerWidth / 7);
            fontSize = Math.floor(window.innerHeight / (width * charAspectRatio));
            if (fontSize * width * charAspectRatio < window.innerHeight) {
                width = Math.floor(window.innerHeight / (fontSize * charAspectRatio));
            }
        }

        const height = calculateHeight(width, video.videoWidth, video.videoHeight);
        canvas.width = width;
        canvas.height = height;

        // Mirror horizontally so the preview reads as a selfie.
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const ascii = convertToAscii(imageData, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        asciiOutput.style.fontSize = `${fontSize}px`;
        asciiOutput.style.width = '100%';
        asciiOutput.textContent = ascii;
    }
});
