document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pongCanvas');
    const ctx = canvas.getContext('2d');
    const startOverlay = document.getElementById('startOverlay');
    let isSinglePlayer = false;

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game objects
    const paddleHeight = 100;
    const paddleWidth = 10;
    const ballSize = 10;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballSpeedX = 50;
    let ballSpeedY = 50;
    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;
    let leftScore = 0;
    let rightScore = 0;
    let gameRunning = false;

    // AI settings
    const aiReactionDelay = 0.4; // Lower = faster reaction
    const aiMaxSpeed = 14; // Maximum speed of AI paddle

    // Paddle movement
    const paddleSpeed = 8;
    const keys = {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false
    };

    // Event listeners for keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key in keys) {
            keys[e.key] = true;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key in keys) {
            keys[e.key] = false;
        }
    });

    function movePaddles() {
        if (keys.ArrowUp && rightPaddleY > 0) rightPaddleY -= paddleSpeed;
        if (keys.ArrowDown && rightPaddleY < canvas.height - paddleHeight) rightPaddleY += paddleSpeed;

        if (isSinglePlayer) {
            // AI movement for left paddle
            const paddleCenter = leftPaddleY + paddleHeight / 2;
            const targetY = ballY;
            const distance = targetY - paddleCenter;
            
            // Add some delay and speed limit to make AI beatable
            const movement = distance * aiReactionDelay;
            const limitedMovement = Math.min(Math.abs(movement), aiMaxSpeed) * Math.sign(movement);
            
            leftPaddleY += limitedMovement;
            leftPaddleY = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddleY));
        } else {
            // Manual control for right paddle in multiplayer
            if (keys.w && leftPaddleY > 0) leftPaddleY -= paddleSpeed;
            if (keys.s && leftPaddleY < canvas.height - paddleHeight) leftPaddleY += paddleSpeed;
        }
    }

    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = Math.random() > 0.5 ? 7 : -7;
        ballSpeedY = (Math.random() - 0.5) * 5;
    }

    function checkCollision() {
        // Top and bottom walls
        if (ballY <= 0 || ballY >= canvas.height) {
            ballSpeedY = -ballSpeedY;
        }

        // Paddles
        if (ballX <= paddleWidth && ballY >= leftPaddleY && ballY <= leftPaddleY + paddleHeight) {
            ballSpeedX = -ballSpeedX;
            let relativeIntersectY = (leftPaddleY + (paddleHeight / 2)) - ballY;
            ballSpeedY = -(relativeIntersectY * 0.1);
        }

        if (ballX >= canvas.width - paddleWidth && ballY >= rightPaddleY && ballY <= rightPaddleY + paddleHeight) {
            ballSpeedX = -ballSpeedX;
            let relativeIntersectY = (rightPaddleY + (paddleHeight / 2)) - ballY;
            ballSpeedY = -(relativeIntersectY * 0.1);
        }

        // Scoring
        if (ballX <= 0) {
            rightScore++;
            resetBall();
        } else if (ballX >= canvas.width) {
            leftScore++;
            resetBall();
        }
    }

    function drawGame() {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw paddles
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
        ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);

        // Draw ball
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.closePath();

        // Draw scores
        ctx.font = '48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(leftScore, canvas.width / 4, 50);
        ctx.fillText(rightScore, (canvas.width / 4) * 3, 50);

        // Draw center line
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function gameLoop() {
        if (!gameRunning) return;

        movePaddles();
        
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        checkCollision();
        drawGame();
        
        requestAnimationFrame(gameLoop);
    }

    // Style the mode buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.style.margin = '0 10px';
        btn.style.padding = '10px 20px';
        btn.style.fontSize = '16px';
        btn.style.cursor = 'pointer';
    });

    document.getElementById('singlePlayerBtn').addEventListener('click', () => {
        isSinglePlayer = true;
        startGame();
    });

    document.getElementById('multiPlayerBtn').addEventListener('click', () => {
        isSinglePlayer = false;
        startGame();
    });

    function startGame() {
        gameRunning = true;
        startOverlay.style.display = 'none';
        canvas.classList.add('game-started');
        resetBall();
        gameLoop();
    }

    // Initial draw
    drawGame();
});