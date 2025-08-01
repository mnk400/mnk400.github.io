class GradientWallpaperGenerator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.updatePreview();
    }

    initializeElements() {
        this.color1Input = document.getElementById('color1');
        this.color1Text = document.getElementById('color1-text');
        this.color2Input = document.getElementById('color2');
        this.color2Text = document.getElementById('color2-text');
        this.orientationToggle = document.querySelector('.orientation-toggle');
        this.directionToggle = document.querySelector('.direction-toggle');
        this.typeToggle = document.querySelector('.type-toggle');
        this.smoothnessSlider = document.getElementById('smoothness-input');
        this.downloadBtn = document.getElementById('download-btn');
        this.gradientPreview = document.getElementById('gradient-preview');
        this.canvas = document.getElementById('gradient-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.previewCanvas = document.createElement('canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.generatedImageData = null;
        
        this.currentOrientation = 'landscape';
        this.currentDirection = '0';
        this.currentType = 'linear';
    }

    bindEvents() {
        this.color1Input.addEventListener('input', () => {
            this.color1Text.value = this.color1Input.value;
            this.updatePreview();
        });
        
        this.color1Text.addEventListener('input', () => {
            if (this.isValidHexColor(this.color1Text.value)) {
                this.color1Input.value = this.color1Text.value;
                this.updatePreview();
            }
        });
        
        this.color2Input.addEventListener('input', () => {
            this.color2Text.value = this.color2Input.value;
            this.updatePreview();
        });
        
        this.color2Text.addEventListener('input', () => {
            if (this.isValidHexColor(this.color2Text.value)) {
                this.color2Input.value = this.color2Text.value;
                this.updatePreview();
            }
        });

        // Initialize selection switches
        initSwitch('orientation-toggle', (value) => {
            this.currentOrientation = value;
            this.updatePreview();
        });
        
        initSwitch('direction-toggle', (value) => {
            this.currentDirection = value;
            this.updatePreview();
        });
        
        initSwitch('type-toggle', (value) => {
            this.currentType = value;
            this.updateDirectionOptions();
            this.updatePreview();
        });
        
        this.smoothnessSlider.addEventListener('input', () => {
            this.updatePreview();
        });

        this.downloadBtn.addEventListener('click', () => this.downloadImage());
    }

    isValidHexColor(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }

    updateDirectionOptions() {
        const type = this.currentType;
        const container = document.getElementById('direction-toggle');
        
        let options = [];
        
        if (type === 'linear') {
            options = [
                '0:Top to Bottom',
                '90:Left to Right', 
                '45:Diagonal (↗)',
                '135:Diagonal (↘)',
                '180:Bottom to Top',
                '270:Right to Left',
                '225:Diagonal (↙)',
                '315:Diagonal (↖)'
            ];
        } else if (type === 'radial') {
            options = [
                'center:Center',
                'top:Top',
                'bottom:Bottom',
                'left:Left',
                'right:Right',
                'top-left:Top Left',
                'top-right:Top Right',
                'bottom-left:Bottom Left',
                'bottom-right:Bottom Right'
            ];
        }
        
        // Clear and rebuild options
        container.innerHTML = '';
        options.forEach((opt, index) => {
            const parts = opt.split(':');
            const span = document.createElement('span');
            span.id = parts[0];
            span.className = `switch-option${index === 0 ? ' active' : ''}`;
            span.dataset.value = parts[0];
            span.textContent = parts[1];
            container.appendChild(span);
        });
        
        this.currentDirection = options[0].split(':')[0];
        
        // Re-initialize the switch
        initSwitch('direction-toggle', (value) => {
            this.currentDirection = value;
            this.updatePreview();
        });
    }

    updatePreview() {
        const previewDimensions = this.getPreviewDimensions();
        this.renderPreviewImage(previewDimensions);
    }

    getPreviewDimensions() {
        const orientation = this.currentOrientation;
        const maxSize = 400;
        
        switch (orientation) {
            case 'portrait':
                return { width: Math.round(maxSize * 9/16), height: maxSize };
            case 'square':
                return { width: maxSize, height: maxSize };
            default:
                return { width: maxSize, height: Math.round(maxSize * 9/16) };
        }
    }

    renderPreviewImage(dimensions) {
        const { width, height } = dimensions;
        
        this.previewCanvas.width = width;
        this.previewCanvas.height = height;
        
        this.renderGradientToCanvas(dimensions, this.previewCanvas, this.previewCtx, () => {
            const imageUrl = this.previewCanvas.toDataURL('image/png');
            
            this.gradientPreview.style.background = 'none';
            this.gradientPreview.innerHTML = `
                <img src="${imageUrl}" class="img-curved-edges preview-img" alt="Gradient Preview">
            `;
            
            this.generateHighResolution();
        });
    }

    interpolateColor(color1, color2, ratio) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
        
        return this.rgbToHex(r, g, b);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    generateHighResolution() {
        const dimensions = this.getDimensions();
        
        this.renderGradientToCanvas(dimensions, this.canvas, this.ctx, (dimensions) => {
            this.finishGeneration(dimensions);
        });
    }

    getDimensions() {
        const orientation = this.currentOrientation;
        switch (orientation) {
            case 'portrait':
                return { width: 2160, height: 3840 };
            case 'square':
                return { width: 2160, height: 2160 };
            default:
                return { width: 3840, height: 2160 };
        }
    }

    renderGradientToCanvas(dimensions, canvas, ctx, callback) {
        const { width, height } = dimensions;
        const type = this.currentType;
        const direction = this.currentDirection;
        const color1 = this.color1Input.value;
        const color2 = this.color2Input.value;
        const smoothness = parseInt(this.smoothnessSlider.value);
        
        canvas.width = width;
        canvas.height = height;
        
        let gradient;
        
        if (type === 'linear') {
            const cssAngle = parseFloat(direction);
            const radians = cssAngle * Math.PI / 180;
            
            const centerX = width / 2;
            const centerY = height / 2;
            
            let x1, y1, x2, y2;
            
            if (cssAngle === 0) {
                x1 = centerX; y1 = 0;
                x2 = centerX; y2 = height;
            } else if (cssAngle === 90) {
                x1 = 0; y1 = centerY;
                x2 = width; y2 = centerY;
            } else if (cssAngle === 180) {
                x1 = centerX; y1 = height;
                x2 = centerX; y2 = 0;
            } else if (cssAngle === 270) {
                x1 = width; y1 = centerY;
                x2 = 0; y2 = centerY;
            } else {
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);
                
                const halfWidth = width / 2;
                const halfHeight = height / 2;
                
                const corners = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight }
                ];
                
                let maxDistance = 0;
                corners.forEach(corner => {
                    const projectedDistance = Math.abs(corner.x * cos + corner.y * sin);
                    maxDistance = Math.max(maxDistance, projectedDistance);
                });
                
                x1 = centerX - cos * maxDistance;
                y1 = centerY - sin * maxDistance;
                x2 = centerX + cos * maxDistance;
                y2 = centerY + sin * maxDistance;
            }
            
            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        } else if (type === 'radial') {
            let centerX = width / 2;
            let centerY = height / 2;
            
            if (direction.includes('top')) centerY = 0;
            if (direction.includes('bottom')) centerY = height;
            if (direction.includes('left')) centerX = 0;
            if (direction.includes('right')) centerX = width;
            
            const corners = [
                { x: 0, y: 0 },
                { x: width, y: 0 },
                { x: width, y: height },
                { x: 0, y: height }
            ];
            
            const radius = Math.max(...corners.map(corner => 
                Math.sqrt(Math.pow(corner.x - centerX, 2) + Math.pow(corner.y - centerY, 2))
            ));
            
            gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        }
        
        const steps = Math.max(2, Math.floor(smoothness / 10) + 2);
        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            const color = this.interpolateColor(color1, color2, ratio);
            gradient.addColorStop(ratio, color);
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        if (callback) callback(dimensions);
    }

    finishGeneration(dimensions) {
        this.canvas.toBlob((blob) => {
            this.generatedImageData = blob;
            this.downloadBtn.style.display = 'inline-block';
        }, 'image/png', 1.0);
    }

    downloadImage() {
        if (!this.generatedImageData) return;
        
        const orientation = this.currentOrientation;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `gradient-wallpaper-${orientation}-${timestamp}.png`;
        
        const url = URL.createObjectURL(this.generatedImageData);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GradientWallpaperGenerator();
});
