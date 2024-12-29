const gameContainer = document.getElementById('game-container');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset-btn');

let gameState = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
const humanPlayer = 'X';
const aiPlayer = 'O';
let currentPlayer = humanPlayer;

// Create game board
for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('ttt-cell');
    cell.setAttribute('data-index', i);
    cell.setAttribute('data-content', ''); // Initialize empty content
    cell.addEventListener('click', handleCellClick);
    gameContainer.appendChild(cell);
}

function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (gameState[clickedCellIndex] !== '' || !gameActive || currentPlayer !== humanPlayer) return;

    makeMove(clickedCellIndex, humanPlayer);

    if (gameActive) {
        setTimeout(aiMove, 500);
    }
}

function makeMove(index, player) {
    gameState[index] = player;
    const cell = gameContainer.children[index];
    cell.setAttribute('data-content', player); // Update content attribute
    cell.classList.add(player.toLowerCase());

    if (checkWin(player)) {
        endGame(player);
    } else if (gameState.every(cell => cell !== '')) {
        endGame(null);
    } else {
        currentPlayer = player === humanPlayer ? aiPlayer : humanPlayer;
        updateStatus();
    }
}

function aiMove() {
    const bestMove = findBestMove(gameState, aiPlayer);
    if (bestMove !== -1) {
        makeMove(bestMove, aiPlayer);
    }
}

function findBestMove(board, player) {
    if (checkWin(humanPlayer)) return -1;
    if (checkWin(aiPlayer)) return -1;

    const emptyCells = board.reduce((acc, cell, index) =>
        cell === '' ? [...acc, index] : acc, []);

    if (emptyCells.length === 0) return -1;

    for (let cell of emptyCells) {
        const newBoard = [...board];
        newBoard[cell] = aiPlayer;
        if (checkWinOnBoard(newBoard, aiPlayer)) return cell;
    }

    for (let cell of emptyCells) {
        const newBoard = [...board];
        newBoard[cell] = humanPlayer;
        if (checkWinOnBoard(newBoard, humanPlayer)) return cell;
    }

    if (board[4] === '') return 4;

    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(corner => board[corner] === '');
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function checkWin(player) {
    return checkWinOnBoard(gameState, player);
}

function checkWinOnBoard(board, player) {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    return winConditions.some(condition =>
        condition.every(index => board[index] === player)
    );
}

function endGame(winner) {
    gameActive = false;

    if (winner) {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        const winningCondition = winConditions.find(condition =>
            condition.every(index => gameState[index] === winner)
        );

        if (winningCondition) {
            winningCondition.forEach(index => {
                gameContainer.children[index].classList.add('winning-cell');
            });
        }

        statusDisplay.textContent = winner === humanPlayer ? 'You Win!' : 'AI Wins!';
    } else {
        statusDisplay.textContent = "It's a Draw!";
    }

    statusDisplay.style.display = 'block';
}

function updateStatus() {
    statusDisplay.textContent = currentPlayer === humanPlayer
        ? "Your Turn"
        : "AI is thinking...";
}

resetButton.addEventListener('click', () => {
    gameState = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = humanPlayer;

    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        cell.setAttribute('data-content', '');
        cell.classList.remove('winning-cell', 'x', 'o');
    });

    updateStatus();
});

updateStatus();