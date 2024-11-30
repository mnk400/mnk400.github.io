const GRID_WIDTH = Math.floor(window.innerWidth / 15);
const GRID_HEIGHT = Math.floor(window.innerHeight / 15) - 4;
let grid = [];
let intervalId = null;

function createGrid() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, 15px)`;
    gameBoard.innerHTML = '';

    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', toggleCell);
            gameBoard.appendChild(cell);
            grid[y][x] = 0;
        }
    }
}

function toggleCell(event) {
    const cell = event.target;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);

    grid[y][x] = 1 - grid[y][x];
    cell.classList.toggle('alive');
}

function countNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const newX = (x + dx + GRID_WIDTH) % GRID_WIDTH;
            const newY = (y + dy + GRID_HEIGHT) % GRID_HEIGHT;

            count += grid[newY][newX];
        }
    }
    return count;
}

function updateGrid() {
    const newGrid = grid.map(row => [...row]);

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const neighbors = countNeighbors(x, y);
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

            if (grid[y][x] === 1) {
                if (neighbors < 2 || neighbors > 3) {
                    newGrid[y][x] = 0;
                    cell.classList.remove('alive');
                }
            } else {
                if (neighbors === 3) {
                    newGrid[y][x] = 1;
                    cell.classList.add('alive');
                }
            }
        }
    }

    grid = newGrid;
}

function startGame() {
    if (intervalId === null) {
        intervalId = setInterval(updateGrid, 200);
    }
}

function stopGame() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function randomizeGrid() {
    stopGame();
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            const alive = Math.random() < 0.3;
            grid[y][x] = alive ? 1 : 0;
            cell.classList.toggle('alive', alive);
        }
    }
    startGame();
}

function clearGrid() {
    stopGame();
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            grid[y][x] = 0;
            cell.classList.remove('alive');
        }
    }
}

// Initialize the grid when the page loads
window.addEventListener('load', () => {
    createGrid();

    const startOverlay = document.getElementById('startOverlay');
    const startButton = document.getElementById('startButton');
    const controls = document.querySelector('.controls');

    startButton.addEventListener('click', () => {
        randomizeGrid();
        startOverlay.style.display = 'none';
        controls.style.display = 'flex';
    });

    // Resize grid on window resize
    window.addEventListener('resize', () => {
        location.reload();
    });
});