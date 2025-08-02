class Colordle {
    constructor() {
        this.targetColor = '';
        this.guesses = [];
        this.currentGuess = 0;
        this.maxGuesses = 6;
        this.gameOver = false;
        this.stats = this.loadStats();
        this.colors = [];
        this.todayDate = this.getTodayDateString();

        this.loadColors().then(() => {
            this.initializeGame();
            this.bindEvents();
        });
    }

    async loadColors() {
        try {
            const response = await fetch('/assets/data/colordle-colors.json');
            const data = await response.json();
            this.colors = data.colors;
        } catch (error) {
            console.error('Failed to load colors:', error);
            // Fallback to a few colors if JSON fails to load
            this.colors = [
                "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
                "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA", "#F1948A", "#85C1E9", "#F4D03F", "#A9DFBF"
            ];
        }
    }

    getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    initializeGame() {
        const savedGame = this.loadTodaysGame();

        if (savedGame && savedGame.date === this.todayDate) {
            // Load existing game for today
            this.targetColor = savedGame.targetColor;
            this.guesses = savedGame.guesses || [];
            this.currentGuess = savedGame.currentGuess || 0;
            this.gameOver = savedGame.gameOver || false;

            this.renderTargetColor();
            this.renderGameBoard();
            this.restoreGameState();
        } else {
            // Start new game for today
            this.generateTodaysTargetColor();
            this.renderTargetColor();
            this.renderGameBoard();
            this.saveTodaysGame();
        }

        this.updateStats();
    }

    generateTodaysTargetColor() {
        // Use date as seed for consistent daily color
        const dateHash = this.hashCode(this.todayDate);
        const colorIndex = Math.abs(dateHash) % this.colors.length;
        this.targetColor = this.colors[colorIndex];
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    renderTargetColor() {
        const colorDisplay = document.getElementById('color-display');
        colorDisplay.style.backgroundColor = this.targetColor;
    }

    renderGameBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.innerHTML = `
                <div class="hex-cells">
                    <div class="hex-cell hash-cell">#</div>
                    ${Array(6).fill('<div class="hex-cell empty-cell"></div>').join('')}
                </div>
            `;
            gameBoard.appendChild(row);
        }
    }

    bindEvents() {
        const guessInput = document.getElementById('guess-input');
        const submitButton = document.getElementById('submit-guess');
        const shareButton = document.getElementById('share-results');

        submitButton.addEventListener('click', () => this.submitGuess());
        guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitGuess();
        });

        guessInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase();
            if (!value.startsWith('#')) {
                value = '#' + value.replace('#', '');
            }
            e.target.value = value;
        });

        shareButton.addEventListener('click', () => this.shareResults());
    }

    submitGuess() {
        if (this.gameOver) return;

        const guessInput = document.getElementById('guess-input');
        const guess = guessInput.value.toUpperCase();

        if (!this.isValidHex(guess)) {
            this.showMessage('Please enter a valid hex color code (e.g., #FF5733)', 'error');
            return;
        }

        this.processGuess(guess);
        guessInput.value = '';

        if (guess === this.targetColor) {
            this.endGame(true);
        } else if (this.currentGuess >= this.maxGuesses) {
            this.endGame(false);
        }
    }

    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    processGuess(guess) {
        const row = document.querySelectorAll('.guess-row')[this.currentGuess];
        const hashCell = row.querySelector('.hex-cell.hash-cell');
        const hexCells = row.querySelectorAll('.hex-cell:not(.hash-cell)');

        // Set the # cell background to the guessed color
        hashCell.style.backgroundColor = guess;

        // Generate feedback
        const feedback = this.generateFeedback(guess);
        const guessHex = guess.slice(1); // Remove #

        // Display each hex digit with its feedback color
        hexCells.forEach((cell, index) => {
            cell.textContent = guessHex[index];
            cell.className = `hex-cell ${feedback[index] === '🟢' ? 'correct' :
                feedback[index] === '🟡' ? 'close' : 'wrong'}`;
        });

        this.guesses.push({
            guess: guess,
            feedback: feedback
        });

        this.currentGuess++;
        this.saveTodaysGame();
    }

    generateFeedback(guess) {
        const target = this.targetColor.slice(1); // Remove #
        const guessHex = guess.slice(1); // Remove #
        const feedback = [];

        const targetChars = target.split('');
        const guessChars = guessHex.split('');
        const usedTargetIndices = new Set();
        const usedGuessIndices = new Set();

        // First pass: find exact matches
        for (let i = 0; i < 6; i++) {
            if (guessChars[i] === targetChars[i]) {
                feedback[i] = '🟢';
                usedTargetIndices.add(i);
                usedGuessIndices.add(i);
            }
        }

        // Second pass: find characters in wrong positions
        for (let i = 0; i < 6; i++) {
            if (usedGuessIndices.has(i)) continue;

            let found = false;
            for (let j = 0; j < 6; j++) {
                if (usedTargetIndices.has(j)) continue;
                if (guessChars[i] === targetChars[j]) {
                    feedback[i] = '🟡';
                    usedTargetIndices.add(j);
                    found = true;
                    break;
                }
            }

            if (!found) {
                feedback[i] = '⚫';
            }
        }

        return feedback;
    }

    endGame(won) {
        this.gameOver = true;
        const inputSection = document.getElementById('input-section');
        inputSection.style.display = 'none';

        if (won) {
            this.showMessage(`🎉 Congratulations! You guessed ${this.targetColor} in ${this.currentGuess} tries! Come back tomorrow for a new challenge.`, 'success');
            this.stats.wins++;
            this.stats.currentStreak++;
            this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
        } else {
            this.showMessage(`😞 Game over! The color was ${this.targetColor}. Come back tomorrow for a new challenge.`, 'error');
            this.stats.currentStreak = 0;
        }

        this.stats.gamesPlayed++;
        this.saveStats();
        this.updateStats();
        this.saveTodaysGame();

        // Show results section
        document.getElementById('game-results').style.display = 'block';
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('game-message');
        messageDiv.textContent = message;
        messageDiv.className = `game-message ${type}`;

        // Only auto-hide validation errors, not game end messages
        if (type === 'error' && message.includes('Please enter a valid')) {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'game-message';
            }, 3000);
        }
        // Success/failure game end messages stay visible permanently
    }



    loadStats() {
        const saved = localStorage.getItem('colordle-stats');
        return saved ? JSON.parse(saved) : {
            gamesPlayed: 0,
            wins: 0,
            currentStreak: 0,
            maxStreak: 0
        };
    }

    saveStats() {
        localStorage.setItem('colordle-stats', JSON.stringify(this.stats));
    }

    loadTodaysGame() {
        const saved = localStorage.getItem('colordle-daily-game');
        return saved ? JSON.parse(saved) : null;
    }

    saveTodaysGame() {
        const gameState = {
            date: this.todayDate,
            targetColor: this.targetColor,
            guesses: this.guesses,
            currentGuess: this.currentGuess,
            gameOver: this.gameOver
        };
        localStorage.setItem('colordle-daily-game', JSON.stringify(gameState));
    }

    restoreGameState() {
        // Restore previous guesses on the board
        this.guesses.forEach((guessData, index) => {
            const row = document.querySelectorAll('.guess-row')[index];
            const hashCell = row.querySelector('.hex-cell.hash-cell');
            const hexCells = row.querySelectorAll('.hex-cell:not(.hash-cell)');

            // Set the # cell background to the guessed color
            hashCell.style.backgroundColor = guessData.guess;

            const guessHex = guessData.guess.slice(1); // Remove #

            // Display each hex digit with its feedback color
            hexCells.forEach((cell, cellIndex) => {
                cell.textContent = guessHex[cellIndex];
                cell.className = `hex-cell ${guessData.feedback[cellIndex] === '🟢' ? 'correct' :
                    guessData.feedback[cellIndex] === '🟡' ? 'close' : 'wrong'}`;
            });
        });

        if (this.gameOver) {
            const inputSection = document.getElementById('input-section');
            inputSection.style.display = 'none';

            const won = this.guesses.length > 0 && this.guesses[this.guesses.length - 1].guess === this.targetColor;
            if (won) {
                this.showMessage(`🎉 You completed today's Colordle! Come back tomorrow for a new challenge.`, 'success');
            } else {
                this.showMessage(`😞 You didn't get today's color: ${this.targetColor}. Come back tomorrow for a new challenge.`, 'error');
            }

            // Show results section for completed games
            document.getElementById('game-results').style.display = 'block';
        }
    }

    updateStats() {
        document.getElementById('games-played').textContent = this.stats.gamesPlayed;
        document.getElementById('win-percentage').textContent =
            this.stats.gamesPlayed > 0 ? Math.round((this.stats.wins / this.stats.gamesPlayed) * 100) : 0;
        document.getElementById('current-streak').textContent = this.stats.currentStreak;
        document.getElementById('max-streak').textContent = this.stats.maxStreak;
    }

    getTimeUntilNextGame() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntil = tomorrow - now;
        const hours = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }

    shareResults() {
        const shareText = this.generateShareText();
        const shareTextDiv = document.getElementById('share-text');
        const shareButton = document.getElementById('share-results');

        shareTextDiv.textContent = shareText;
        shareTextDiv.style.display = 'block';

        // Try to copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareText).then(() => {
                shareButton.textContent = 'Copied!';
                setTimeout(() => {
                    shareButton.textContent = 'Share Results';
                }, 2000);
            }).catch(() => {
                shareButton.textContent = 'Select text above to copy';
                setTimeout(() => {
                    shareButton.textContent = 'Share Results';
                }, 3000);
            });
        } else {
            // Fallback for older browsers
            shareTextDiv.select();
            shareButton.textContent = 'Select text above to copy';
            setTimeout(() => {
                shareButton.textContent = 'Share Results';
            }, 3000);
        }
    }

    generateShareText() {
        const won = this.gameOver && this.guesses.length > 0 && this.guesses[this.guesses.length - 1].guess === this.targetColor;
        const attempts = won ? this.currentGuess : 'X';

        let shareText = `Colordle ${this.todayDate}\n`;
        shareText += `${attempts}/6\n\n`;

        // Generate the grid
        this.guesses.forEach(guessData => {
            const row = guessData.feedback.map(feedback => {
                if (feedback === '🟢') return '🟩';
                if (feedback === '🟡') return '🟨';
                return '⬛';
            }).join('');
            shareText += row + '\n';
        });

        shareText += `\nPlay at: ${window.location.origin}/more/colordle`;

        return shareText;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Colordle();
});