document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('game-of-life-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start-btn');
    const randomBtn = document.getElementById('random-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    const maxCanvasHeight = 500;
    
    // Get the parent container's width to determine canvas width
    const gameContainer = document.getElementById('game-of-life-container');
    const canvasWidth = gameContainer ? gameContainer.offsetWidth : window.innerWidth;
    const canvasHeight = Math.min(maxCanvasHeight, window.innerHeight - 280);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const cellSize = isMobile ? Math.floor(canvasWidth / 16) : 21;
    const rows = Math.floor(canvas.height / cellSize);
    const cols = Math.floor(canvas.width / cellSize);
    let grid = createEmptyGrid();
    let nextGrid = createEmptyGrid();
    
    let gameRunning = false;
    let gameInterval = null;
    const frameRate = 7; 
    const frameInterval = 1000 / frameRate;
    
    // Function to get CSS variable value
    function getCSSVariable(variableName) {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }

    // Colors based on theme
    const colors = {
        background: getCSSVariable('--background-main'),
        cell: getCSSVariable('--red-accent'),
        cellStroke: getCSSVariable('--red-accent')
    };
    
    // Function to update colors based on current theme
    function updateThemeColors() {
        // Get background color from CSS variable
        colors.background = getCSSVariable('--background-main');
        if (typeof render === 'function') {
            render();
        }
    }
    
    // Listen for theme changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'data-theme') {
                updateThemeColors();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });
    
    updateThemeColors();

    function createEmptyGrid() {
        return Array(rows).fill().map(() => Array(cols).fill(0));
    }

    function randomizeGrid() {
        resetGame();
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                grid[i][j] = Math.random() > 0.7 ? 1 : 0;
            }
        }
        
        render();
    }

    function resetGame() {
        grid = createEmptyGrid();
        
        stopGame();
        render();
    }

    function startGame() {
        if (!gameRunning) {
            gameRunning = true;
            startBtn.textContent = 'Pause';
            gameInterval = setInterval(step, frameInterval);
        } else {
            stopGame();
        }
    }

    function stopGame() {
        gameRunning = false;
        startBtn.textContent = 'Start';
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
    }

    function step() {
        computeNextGeneration();
        grid = JSON.parse(JSON.stringify(nextGrid)); // Deep copy
        
        render();
    }

    function computeNextGeneration() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const neighbors = countNeighbors(i, j);
                
                // Conway's Game of Life rules
                if (grid[i][j] === 1) {
                    // Any live cell with fewer than two live neighbors dies (underpopulation)
                    // Any live cell with more than three live neighbors dies (overpopulation)
                    if (neighbors < 2 || neighbors > 3) {
                        nextGrid[i][j] = 0;
                    } else {
                        // Any live cell with two or three live neighbors lives on
                        nextGrid[i][j] = 1;
                    }
                } else {
                    // Any dead cell with exactly three live neighbors becomes a live cell (reproduction)
                    if (neighbors === 3) {
                        nextGrid[i][j] = 1;
                    } else {
                        nextGrid[i][j] = 0;
                    }
                }
            }
        }
    }

    function countNeighbors(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const r = (row + i + rows) % rows;
                const c = (col + j + cols) % cols;
                
                count += grid[r][c];
            }
        }
        return count;
    }

    function render() {
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const gap = 2;
                const radius = 4; 
                
                const x = j * cellSize + gap;
                const y = i * cellSize + gap;
                const width = cellSize - (gap * 2);
                const height = cellSize - (gap * 2);
                
                // rounded rectangle for all cells
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                
                if (grid[i][j] === 1) {
                    ctx.fillStyle = colors.cell;
                    ctx.fill();
                    ctx.strokeStyle = colors.cellStroke;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                } else {
                    // Dead cell border (slightly darker)
                    ctx.strokeStyle = '#a0a0a0';
                    ctx.lineWidth = 0.4;
                    ctx.stroke();
                }
            }
        }
    }

    // Handle canvas click to toggle cell state
    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);

        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            grid[row][col] = grid[row][col] === 0 ? 1 : 0;
            render();
        }
    }

    // Event Listeners
    canvas.addEventListener('click', handleCanvasClick);
    startBtn.addEventListener('click', startGame);
    randomBtn.addEventListener('click', randomizeGrid);
    stepBtn.addEventListener('click', step);
    resetBtn.addEventListener('click', resetGame);

    // Initial render
    resetGame();
});