document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('flappyCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const gameOverScreen = document.getElementById('game-over');
    const startScreen = document.getElementById('start-screen');
    const finalScoreElement = document.getElementById('final-score');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');

    const isMobile = DeviceDetect.isMobileDevice();

    function preventScrolling(e) {
        e.preventDefault();
    }

    function disablePageScrolling() {
        if (isMobile) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.addEventListener('touchmove', preventScrolling, { passive: false });
        }
    }

    function enablePageScrolling() {
        if (isMobile) {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.removeEventListener('touchmove', preventScrolling);
        }
    }

    // Read theme color tokens from CSS custom properties; re-read on theme change.
    let themeText = '#3b3b3b';
    function refreshThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        const t = styles.getPropertyValue('--text-color').trim();
        if (t) themeText = t;
    }
    refreshThemeColors();
    new MutationObserver(refreshThemeColors).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    let gameRunning = false;
    let gameStarted = false;
    let dying = false;
    let score = 0;
    let highScore = localStorage.getItem('flappyHighScore') || 0;
    highScoreElement.textContent = `Best · ${highScore}`;

    const frameInterval = 1000 / 60;
    let gameInterval = null;
    let lastTime = 0;
    let accumulator = 0;

    const bird = {
        x: 50,
        y: canvas.height / 2,
        width: 22,
        height: 22,
        velocity: 0,
        gravity: 0.5,
        jumpStrength: -8,
        alpha: 1,
    };

    const pipes = [];
    const pipeWidth = 50;
    const pipeGap = 150;
    const pipeSpeed = 2;
    let pipeTimer = 0;
    const pipeInterval = 90;

    function resetGame() {
        bird.y = canvas.height / 2;
        bird.velocity = 0;
        bird.alpha = 1;
        pipes.length = 0;
        score = 0;
        pipeTimer = 0;
        dying = false;
        updateScore();
        gameOverScreen.classList.remove('visible');
        startScreen.classList.remove('visible');
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'none';
        canvas.classList.remove('dimmed');

        if (gameInterval) {
            cancelAnimationFrame(gameInterval);
            gameInterval = null;
        }
    }

    function rafLoop(timestamp) {
        if (!gameRunning) return;
        if (lastTime === 0) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;
        accumulator = Math.min(accumulator + delta, 250);
        while (accumulator >= frameInterval) {
            updateBird();
            updatePipes();
            accumulator -= frameInterval;
        }
        render();
        gameInterval = requestAnimationFrame(rafLoop);
    }

    function startGame() {
        resetGame();
        gameRunning = true;
        gameStarted = true;
        lastTime = 0;
        accumulator = 0;

        disablePageScrolling();

        gameInterval = requestAnimationFrame(rafLoop);
    }

    function endGame() {
        if (dying) return;
        gameRunning = false;
        dying = true;

        if (gameInterval) {
            cancelAnimationFrame(gameInterval);
            gameInterval = null;
        }

        enablePageScrolling();
        finalScoreElement.textContent = score;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('flappyHighScore', highScore);
            highScoreElement.textContent = `Best · ${highScore}`;
        }

        // Death animation: bird keeps falling, alpha decays, then card fades in.
        const start = performance.now();
        const fallDuration = 500;
        function deathFrame(now) {
            const t = Math.min(1, (now - start) / fallDuration);
            bird.velocity += bird.gravity * 0.6;
            bird.y += bird.velocity;
            if (bird.y > canvas.height + 40) bird.y = canvas.height + 40;
            bird.alpha = 1 - t * 0.7;
            render();
            if (t < 1) {
                requestAnimationFrame(deathFrame);
            } else {
                canvas.classList.add('dimmed');
                gameOverScreen.style.display = 'block';
                requestAnimationFrame(() => gameOverScreen.classList.add('visible'));
            }
        }
        requestAnimationFrame(deathFrame);
    }

    function updateScore() {
        scoreElement.textContent = `Score · ${score}`;
    }

    function jump() {
        if (gameRunning) {
            bird.velocity = bird.jumpStrength;
        }
    }

    function updateBird() {
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

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
            passed: false,
        });
    }

    function updatePipes() {
        pipeTimer++;
        if (pipeTimer >= pipeInterval) {
            createPipe();
            pipeTimer = 0;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= pipeSpeed;

            if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                pipe.passed = true;
                score++;
                updateScore();
            }

            if (bird.x < pipe.x + pipeWidth &&
                bird.x + bird.width > pipe.x &&
                (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)) {
                endGame();
            }

            if (pipe.x + pipeWidth < 0) {
                pipes.splice(i, 1);
            }
        }
    }

    function drawBird() {
        ctx.save();
        ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
        const tilt = Math.max(-0.4, Math.min(1.0, bird.velocity / 12));
        ctx.rotate(tilt);
        ctx.globalAlpha = bird.alpha;
        ctx.fillStyle = themeText;
        ctx.font = '500 28px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('•', 0, 0);
        ctx.restore();
    }

    function drawPipes() {
        ctx.save();
        ctx.fillStyle = themeText;
        pipes.forEach(pipe => {
            // Soft column fill
            ctx.globalAlpha = 0.10;
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, pipe.bottomHeight);
            // Hairline inner edges, echoing the rest of the site.
            ctx.globalAlpha = 0.22;
            ctx.fillRect(pipe.x, 0, 1, pipe.topHeight);
            ctx.fillRect(pipe.x + pipeWidth - 1, 0, 1, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.bottomY, 1, pipe.bottomHeight);
            ctx.fillRect(pipe.x + pipeWidth - 1, pipe.bottomY, 1, pipe.bottomHeight);
            // Cap line where the gap begins
            ctx.fillRect(pipe.x, pipe.topHeight - 1, pipeWidth, 1);
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, 1);
        });
        ctx.restore();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPipes();
        drawBird();
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    startBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    });

    restartBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!gameStarted || dying) {
                startGame();
            } else {
                jump();
            }
        }
    });

    function handleGameInteraction(e) {
        e.preventDefault();
        if (!gameStarted || dying) {
            startGame();
        } else {
            jump();
        }
    }

    canvas.addEventListener('click', handleGameInteraction);
    canvas.addEventListener('touchstart', handleGameInteraction, { passive: false });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    window.addEventListener('beforeunload', () => {
        enablePageScrolling();
        if (gameInterval) {
            cancelAnimationFrame(gameInterval);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameRunning) {
            enablePageScrolling();
            if (gameInterval) {
                cancelAnimationFrame(gameInterval);
                gameInterval = null;
            }
        } else if (!document.hidden && gameRunning && !gameInterval) {
            lastTime = 0;
            gameInterval = requestAnimationFrame(rafLoop);
        }
    });

    if (isMobile) {
        canvas.style.cursor = 'pointer';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }

    // Show start screen with the same fade as game-over.
    startScreen.style.display = 'block';
    canvas.classList.add('dimmed');
    requestAnimationFrame(() => startScreen.classList.add('visible'));
    render();
});
