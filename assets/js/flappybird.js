document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('flappyCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const gameOverScreen = document.getElementById('game-over');
    const startScreen = document.getElementById('start-screen');
    const finalScoreElement = document.getElementById('final-score');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');

    // Game state
    let gameRunning = false;
    let gameStarted = false;
    let score = 0;
    let highScore = localStorage.getItem('flappyHighScore') || 0;
    highScoreElement.textContent = `High Score: ${highScore}`;

    // Bird properties
    const bird = {
        x: 50,
        y: canvas.height / 2,
        width: 20,
        height: 20,
        velocity: 0,
        gravity: 0.5,
        jumpStrength: -8,
        color: '#FFD700'
    };

    // Pipe properties
    const pipes = [];
    const pipeWidth = 50;
    const pipeGap = 150;
    const pipeSpeed = 2;
    let pipeTimer = 0;
    const pipeInterval = 90;

    // Game functions
    function resetGame() {
        bird.y = canvas.height / 2;
        bird.velocity = 0;
        pipes.length = 0;
        score = 0;
        pipeTimer = 0;
        updateScore();
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'none';
    }

    function startGame() {
        resetGame();
        gameRunning = true;
        gameStarted = true;
        gameLoop();
    }

    function endGame() {
        gameRunning = false;
        finalScoreElement.textContent = score;
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('flappyHighScore', highScore);
            highScoreElement.textContent = `High Score: ${highScore}`;
        }
        
        gameOverScreen.style.display = 'block';
    }

    function updateScore() {
        scoreElement.textContent = `Score: ${score}`;
    }

    function jump() {
        if (gameRunning) {
            bird.velocity = bird.jumpStrength;
        }
    }

    function updateBird() {
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        // Check boundaries
        if (bird.y < 0 || bird.y + bird.height > canvas.height) {
            endGame();
        }
    }

    function createPipe() {
        const minHeight = 50;
        const maxHeight = canvas.height - pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + pipeGap,
            bottomHeight: canvas.height - (topHeight + pipeGap),
            passed: false
        });
    }

    function updatePipes() {
        // Create new pipes
        pipeTimer++;
        if (pipeTimer >= pipeInterval) {
            createPipe();
            pipeTimer = 0;
        }

        // Update existing pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= pipeSpeed;

            // Check for scoring
            if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                pipe.passed = true;
                score++;
                updateScore();
            }

            // Check collision
            if (bird.x < pipe.x + pipeWidth &&
                bird.x + bird.width > pipe.x &&
                (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)) {
                endGame();
            }

            // Remove off-screen pipes
            if (pipe.x + pipeWidth < 0) {
                pipes.splice(i, 1);
            }
        }
    }

    function drawBird() {
        ctx.fillStyle = bird.color;
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
        
        // simple eye
        ctx.fillStyle = '#000';
        ctx.fillRect(bird.x + 12, bird.y + 5, 3, 3);
    }

    function drawPipes() {
        ctx.fillStyle = '#228B22';
        
        pipes.forEach(pipe => {
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, pipe.bottomHeight);
            
            // caps
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
            ctx.fillRect(pipe.x - 5, pipe.bottomY, pipeWidth + 10, 20);
            ctx.fillStyle = '#228B22';
        });
    }

    function drawBackground() {
        ctx.fillStyle = '#B0E2FF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawBackground();
        drawPipes();
        drawBird();
    }

    function gameLoop() {
        if (!gameRunning) return;
        
        updateBird();
        updatePipes();
        render();
        
        requestAnimationFrame(gameLoop);
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!gameStarted) {
                startGame();
            } else {
                jump();
            }
        }
    });
    
    canvas.addEventListener('click', () => {
        if (!gameStarted) {
            startGame();
        } else {
            jump();
        }
    });

    render();
});