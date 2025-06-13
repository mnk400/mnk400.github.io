// Minesweeper Game
const gridElement = document.getElementById('minesweeper-grid');
const mineCounterElement = document.getElementById('mine-counter');
const timerElement = document.getElementById('game-timer');
const newGameButton = document.getElementById('new-game-btn');
const gameStatusElement = document.getElementById('game-status');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

// Game configuration
const difficulties = {
    beginner: { rows: 10, cols: 12, mines: 10 },
    intermediate: { rows: 18, cols: 14, mines: 40 },
    expert: { rows: 25, cols: 14, mines: 99 }
};

// Game state
let gameConfig = difficulties.beginner;
let grid = [];
let minesLeft = 0;
let gameActive = false;
let timerInterval = null;
let gameTime = 0;
let firstClick = true;

// Initialize the game
function initGame() {
    // Clear previous game
    clearInterval(timerInterval);
    gridElement.innerHTML = '';
    gameTime = 0;
    firstClick = true;
    
    // Update UI
    timerElement.textContent = `Time: ${gameTime}`;
    minesLeft = gameConfig.mines;
    mineCounterElement.textContent = `Mines: ${minesLeft}`;
    gameStatusElement.textContent = '';
    
    // Create grid
    gridElement.style.gridTemplateColumns = `repeat(${gameConfig.cols}, 1fr)`;
    grid = [];
    
    // Calculate cell size based on available width
    const gameWrapper = document.querySelector('.game-wrapper');
    const availableWidth = Math.min(gameWrapper.clientWidth, window.innerWidth);
    
    // Calculate cell size based on grid dimensions and available width
    // Account for grid gap (2px), cell borders (2px on each side), and grid padding (4px on each side)
    const totalHorizontalSpacing = (gameConfig.cols - 1) * 2 + gameConfig.cols * 4 + 8;
    const cellSize = Math.floor((availableWidth - totalHorizontalSpacing) / gameConfig.cols);
    
    // Make sure grid doesn't overflow container
    const finalGridWidth = availableWidth;
    gridElement.style.width = `${finalGridWidth}px`;

    // Initialize empty grid
    for (let row = 0; row < gameConfig.rows; row++) {
        grid[row] = [];
        for (let col = 0; col < gameConfig.cols; col++) {
            grid[row][col] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0
            };
            
            // Create cell element
            const cell = document.createElement('div');
            cell.classList.add('ms-cell');
            cell.setAttribute('data-row', row);
            cell.setAttribute('data-col', col);
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            
            // Adjust font size based on cell size
            cell.style.fontSize = `${Math.max(cellSize * 0.5, 12)}px`;
            
            // Add event listeners
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleRightClick);
            
            gridElement.appendChild(cell);
        }
    }
    
    gameActive = true;
}

// Debounce function to limit resize events
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Place mines after first click to ensure first click is safe
function placeMines(safeRow, safeCol) {
    let minesPlaced = 0;
    
    while (minesPlaced < gameConfig.mines) {
        const row = Math.floor(Math.random() * gameConfig.rows);
        const col = Math.floor(Math.random() * gameConfig.cols);
        
        // Ensure we don't place a mine on the first clicked cell or where a mine already exists
        if ((row !== safeRow || col !== safeCol) && !grid[row][col].isMine) {
            grid[row][col].isMine = true;
            minesPlaced++;
        }
    }
    
    // Calculate adjacent mines for each cell
    for (let row = 0; row < gameConfig.rows; row++) {
        for (let col = 0; col < gameConfig.cols; col++) {
            if (!grid[row][col].isMine) {
                grid[row][col].adjacentMines = countAdjacentMines(row, col);
            }
        }
    }
}

// Count adjacent mines for a cell
function countAdjacentMines(row, col) {
    let count = 0;
    
    // Check all 8 adjacent cells
    for (let r = Math.max(0, row - 1); r <= Math.min(gameConfig.rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(gameConfig.cols - 1, col + 1); c++) {
            if (r === row && c === col) continue; // Skip the cell itself
            if (grid[r][c].isMine) count++;
        }
    }
    
    return count;
}

// Handle left click on a cell
function handleCellClick(event) {
    if (!gameActive) return;
    
    const row = parseInt(event.target.getAttribute('data-row'));
    const col = parseInt(event.target.getAttribute('data-col'));
    
    // First click should always be safe
    if (firstClick) {
        firstClick = false;
        placeMines(row, col);
        startTimer();
    }
    
    // Don't reveal flagged cells
    if (grid[row][col].isFlagged) return;
    
    // Reveal the cell
    revealCell(row, col);
}

// Handle right click (flag placement)
function handleRightClick(event) {
    event.preventDefault();
    if (!gameActive) return;
    
    const row = parseInt(event.target.getAttribute('data-row'));
    const col = parseInt(event.target.getAttribute('data-col'));
    
    // Can't flag revealed cells
    if (grid[row][col].isRevealed) return;
    
    const cell = event.target;
    
    if (grid[row][col].isFlagged) {
        // Remove flag
        grid[row][col].isFlagged = false;
        cell.classList.remove('flagged');
        minesLeft++;
    } else {
        // Add flag
        grid[row][col].isFlagged = true;
        cell.classList.add('flagged');
        minesLeft--;
    }
    
    mineCounterElement.textContent = `Mines: ${minesLeft}`;
}

// Reveal a cell
function revealCell(row, col) {
    const cell = grid[row][col];
    
    // Skip if already revealed or flagged
    if (cell.isRevealed || cell.isFlagged) return;
    
    // Mark as revealed
    cell.isRevealed = true;
    
    // Get the DOM element
    const cellElement = document.querySelector(`.ms-cell[data-row="${row}"][data-col="${col}"]`);
    cellElement.classList.add('revealed');
    
    // Check if it's a mine
    if (cell.isMine) {
        cellElement.classList.add('mine');
        endGame(false);
        return;
    }
    
    // If it has adjacent mines, show the number
    if (cell.adjacentMines > 0) {
        cellElement.textContent = cell.adjacentMines;
        cellElement.classList.add(`adjacent-${cell.adjacentMines}`);
    } else {
        // If no adjacent mines, reveal all adjacent cells (flood fill)
        for (let r = Math.max(0, row - 1); r <= Math.min(gameConfig.rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(gameConfig.cols - 1, col + 1); c++) {
                if (r === row && c === col) continue; // Skip the cell itself
                revealCell(r, c);
            }
        }
    }
    
    // Check if the game is won
    checkWin();
}

// Check if all non-mine cells are revealed
function checkWin() {
    for (let row = 0; row < gameConfig.rows; row++) {
        for (let col = 0; col < gameConfig.cols; col++) {
            // If a non-mine cell is not revealed, the game is not won yet
            if (!grid[row][col].isMine && !grid[row][col].isRevealed) {
                return;
            }
        }
    }
    
    // All non-mine cells are revealed, game is won
    endGame(true);
}

// End the game
function endGame(isWin) {
    gameActive = false;
    clearInterval(timerInterval);
    
    if (isWin) {
        gameStatusElement.textContent = 'You Win! 🎉';
        gameStatusElement.classList.add('win');
        
        // Flag all mines
        for (let row = 0; row < gameConfig.rows; row++) {
            for (let col = 0; col < gameConfig.cols; col++) {
                if (grid[row][col].isMine && !grid[row][col].isFlagged) {
                    const cellElement = document.querySelector(`.ms-cell[data-row="${row}"][data-col="${col}"]`);
                    cellElement.classList.add('flagged');
                }
            }
        }
    } else {
        gameStatusElement.textContent = 'Game Over! 💣';
        gameStatusElement.classList.add('lose');
        
        // Reveal all mines
        for (let row = 0; row < gameConfig.rows; row++) {
            for (let col = 0; col < gameConfig.cols; col++) {
                if (grid[row][col].isMine) {
                    const cellElement = document.querySelector(`.ms-cell[data-row="${row}"][data-col="${col}"]`);
                    cellElement.classList.add('revealed');
                    cellElement.classList.add('mine');
                    
                    // Show incorrectly flagged cells
                    if (grid[row][col].isFlagged) {
                        cellElement.classList.add('flagged-correct');
                    }
                } else if (grid[row][col].isFlagged) {
                    // Show incorrectly flagged cells
                    const cellElement = document.querySelector(`.ms-cell[data-row="${row}"][data-col="${col}"]`);
                    cellElement.classList.add('flagged-wrong');
                }
            }
        }
    }
}

// Start the game timer
function startTimer() {
    timerInterval = setInterval(() => {
        gameTime++;
        timerElement.textContent = `Time: ${gameTime}`;
    }, 1000);
}

// Change difficulty
function changeDifficulty(difficulty) {
    gameConfig = difficulties[difficulty];
    
    // Update active button
    difficultyButtons.forEach(button => {
        if (button.getAttribute('data-difficulty') === difficulty) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    initGame();
}

// Event listeners
newGameButton.addEventListener('click', () => {
    gameStatusElement.classList.remove('win', 'lose');
    initGame();
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        const difficulty = button.getAttribute('data-difficulty');
        gameStatusElement.classList.remove('win', 'lose');
        changeDifficulty(difficulty);
    });
});

// Initialize the game on load
window.addEventListener('load', initGame);

// Prevent context menu on right-click
gridElement.addEventListener('contextmenu', (e) => e.preventDefault());
