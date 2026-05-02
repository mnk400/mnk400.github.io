document.addEventListener('DOMContentLoaded', function() {
    const gridElement = document.getElementById('game-of-life-grid');
    const startBtn = document.getElementById('start-btn');
    const randomBtn = document.getElementById('random-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');

    const isMobile = window.innerWidth <= 768;
    const cols = isMobile ? 16 : 24;
    const rows = cols;

    let state = createEmptyState();
    let cellElements = [];
    let gameRunning = false;
    let gameInterval = null;
    const frameRate = 6;
    const frameInterval = 1000 / frameRate;

    function createEmptyState() {
        return Array(rows).fill().map(() => Array(cols).fill(0));
    }

    function buildGrid() {
        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        cellElements = [];
        for (let i = 0; i < rows; i++) {
            cellElements[i] = [];
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement('div');
                cell.classList.add('gol-cell');
                cell.addEventListener('click', () => toggleCell(i, j));
                gridElement.appendChild(cell);
                cellElements[i][j] = cell;
            }
        }
    }

    function toggleCell(i, j) {
        state[i][j] = state[i][j] ? 0 : 1;
        cellElements[i][j].classList.toggle('alive', state[i][j] === 1);
    }

    function render() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                cellElements[i][j].classList.toggle('alive', state[i][j] === 1);
            }
        }
    }

    function randomize() {
        stopGame();
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                state[i][j] = Math.random() > 0.7 ? 1 : 0;
            }
        }
        render();
    }

    function reset() {
        stopGame();
        state = createEmptyState();
        render();
    }

    function startGame() {
        if (gameRunning) {
            stopGame();
            return;
        }
        gameRunning = true;
        startBtn.textContent = 'Pause';
        gameInterval = setInterval(step, frameInterval);
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
        const next = createEmptyState();
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const n = countNeighbors(i, j);
                if (state[i][j] === 1) {
                    next[i][j] = (n === 2 || n === 3) ? 1 : 0;
                } else {
                    next[i][j] = (n === 3) ? 1 : 0;
                }
            }
        }
        state = next;
        render();
    }

    function countNeighbors(row, col) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                const r = (row + di + rows) % rows;
                const c = (col + dj + cols) % cols;
                count += state[r][c];
            }
        }
        return count;
    }

    startBtn.addEventListener('click', startGame);
    randomBtn.addEventListener('click', randomize);
    stepBtn.addEventListener('click', step);
    resetBtn.addEventListener('click', reset);

    buildGrid();
    render();
});
