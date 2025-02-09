const CELL_SIZE = 15;
const GRID_WIDTH = Math.floor(window.innerWidth / CELL_SIZE);
const GRID_HEIGHT = Math.floor(window.innerHeight / CELL_SIZE);

class GameOfLife {
  constructor() {
    this.grid = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
    this.nextGrid = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
    this.setupCanvas();
    this.createGridLines();
  }

  setupCanvas() {
    // Create main canvas for cells
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = GRID_WIDTH * CELL_SIZE;
    this.canvas.height = GRID_HEIGHT * CELL_SIZE;
    
    // Create separate canvas for grid lines
    this.gridCanvas = document.createElement('canvas');
    this.gridCtx = this.gridCanvas.getContext('2d');
    this.gridCanvas.width = GRID_WIDTH * CELL_SIZE;
    this.gridCanvas.height = GRID_HEIGHT * CELL_SIZE;
    
    // Style and position canvases
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.overflow = 'hidden';
    
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    
    this.gridCanvas.style.position = 'absolute';
    this.gridCanvas.style.top = '0';
    this.gridCanvas.style.left = '0';
    this.gridCanvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    
    container.appendChild(this.canvas);
    container.appendChild(this.gridCanvas);
    
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    gameBoard.appendChild(container);
    gameBoard.style.margin = '0';
    gameBoard.style.padding = '0';
    
    // Add click handler
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    
    // Pre-calculate cell coordinates
    this.cellCoords = new Array(GRID_WIDTH * GRID_HEIGHT);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const index = y * GRID_WIDTH + x;
        this.cellCoords[index] = {
          x: x * CELL_SIZE,
          y: y * CELL_SIZE
        };
      }
    }
  }

  createGridLines() {
    this.gridCtx.strokeStyle = '#ddd';
    this.gridCtx.beginPath();
    
    // Draw vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gridCtx.moveTo(x * CELL_SIZE - 0.5, 0);
      this.gridCtx.lineTo(x * CELL_SIZE - 0.5, this.gridCanvas.height);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gridCtx.moveTo(0, y * CELL_SIZE - 0.5);
      this.gridCtx.lineTo(this.gridCanvas.width, y * CELL_SIZE - 0.5);
    }
    
    this.gridCtx.stroke();
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);
    
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const index = y * GRID_WIDTH + x;
      this.grid[index] = 1 - this.grid[index];
      this.renderCell(x, y);
    }
  }

  countNeighbors(x, y) {
    let count = 0;
    const yAbove = ((y - 1 + GRID_HEIGHT) % GRID_HEIGHT) * GRID_WIDTH;
    const yCenter = y * GRID_WIDTH;
    const yBelow = ((y + 1) % GRID_HEIGHT) * GRID_WIDTH;
    
    const xLeft = (x - 1 + GRID_WIDTH) % GRID_WIDTH;
    const xRight = (x + 1) % GRID_WIDTH;

    count += this.grid[yAbove + xLeft];
    count += this.grid[yAbove + x];
    count += this.grid[yAbove + xRight];
    count += this.grid[yCenter + xLeft];
    count += this.grid[yCenter + xRight];
    count += this.grid[yBelow + xLeft];
    count += this.grid[yBelow + x];
    count += this.grid[yBelow + xRight];

    return count;
  }

  updateGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const index = y * GRID_WIDTH + x;
        const neighbors = this.countNeighbors(x, y);
        const alive = this.grid[index] === 1;
        
        this.nextGrid[index] = alive
          ? (neighbors === 2 || neighbors === 3)
          : neighbors === 3;
      }
    }
    
    [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
    this.render();
  }

  renderCell(x, y) {
    const index = y * GRID_WIDTH + x;
    const coords = this.cellCoords[index];
    
    this.ctx.fillStyle = this.grid[index] ? '#000' : '#fff';
    this.ctx.fillRect(coords.x + 1, coords.y + 1, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  render() {
    // Clear the canvas
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw alive cells
    this.ctx.fillStyle = '#000';
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i]) {
        const coords = this.cellCoords[i];
        this.ctx.fillRect(coords.x + 1, coords.y + 1, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }
  }

  randomize() {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() < 0.3 ? 1 : 0;
    }
    this.render();
  }

  clear() {
    this.grid.fill(0);
    this.render();
  }

  start() {
    if (!this.intervalId) {
      this.canvas.classList.add('game-started');
      this.gridCanvas.classList.add('game-started');
      this.intervalId = setInterval(() => this.updateGrid(), 200);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
  const game = new GameOfLife();
  const startOverlay = document.getElementById('startOverlay');
  const controls = document.querySelector('.controls');

  document.getElementById('startButton').addEventListener('click', () => {
    game.randomize();
    game.start();
    startOverlay.style.display = 'none';
    controls.style.display = 'flex';
  });

  document.getElementById('stopButton')?.addEventListener('click', () => game.stop());
  document.getElementById('clearButton')?.addEventListener('click', () => {
    game.stop();
    game.clear();
  });
  document.getElementById('randomizeButton')?.addEventListener('click', () => {
    game.stop();
    game.randomize();
    game.start();
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => location.reload(), 250);
  });
});