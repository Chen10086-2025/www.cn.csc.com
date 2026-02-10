const TetrisGame = {
    COLS: 10,
    ROWS: 20,
    BLOCK_SIZE: 30,

    canvas: null,
    ctx: null,
    board: [],
    currentPiece: null,
    nextPiece: null,
    holdPiece: null,
    canHold: true,
    gameOver: false,
    isPaused: false,
    isPlaying: false,

    score: 0,
    lines: 0,
    level: 1,
    combo: 0,

    dropInterval: 1000,
    lastDropTime: 0,
    gameLoopId: null,

    pieceQueue: [],
    QUEUE_SIZE: 5,

    keysPressed: {},
    moveRepeatInterval: null,
    repeatTimeout: null,
    initialMoveDelay: 200,
    repeatMoveDelay: 60,
    isRepeatingMove: false,
    repeatDir: 0,

    SHAPES: {
        I: [[1, 1, 1, 1]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1]],
        S: [[0, 1, 1], [1, 1, 0]],
        Z: [[1, 1, 0], [0, 1, 1]],
        J: [[1, 0, 0], [1, 1, 1]],
        L: [[0, 0, 1], [1, 1, 1]]
    },

    COLORS: {
        I: '#00f5ff',
        O: '#ffeb3b',
        T: '#9c27b0',
        S: '#4caf50',
        Z: '#f44336',
        J: '#2196f3',
        L: '#ff9800'
    },

    SPECIAL_COLORS: {
        I: '#00ff88',
        O: '#00ff88',
        T: '#00ff88',
        S: '#ff4444',
        Z: '#ff4444',
        J: '#ffaa00',
        L: '#ffaa00'
    },

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.COLS * this.BLOCK_SIZE;
        this.canvas.height = this.ROWS * this.BLOCK_SIZE;

        this.resetBoard();
        this.pieceQueue = [];
        this.holdPiece = null;
        this.canHold = true;
        this.updateUI();
        this.draw();
    },

    resetBoard() {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
    },

    start() {
        if (this.isPlaying) return;

        this.stopRepeatMove();
        this.keysPressed = {};
        this.lastDropTime = 0;
        
        this.resetBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.isPlaying = true;
        this.dropInterval = 1000;
        this.pieceQueue = [];
        this.holdPiece = null;
        this.canHold = true;

        this.fillPieceQueue();
        this.currentPiece = this.getNextPiece();
        this.nextPiece = this.getNextPiece();

        this.updateUI();
        this.drawNextPiece();
        this.drawHoldPiece();
        this.startGameLoop();

        AudioManager.playClick();
    },

    fillPieceQueue() {
        while (this.pieceQueue.length < this.QUEUE_SIZE) {
            this.pieceQueue.push(this.createPiece());
        }
    },

    getNextPiece() {
        this.fillPieceQueue();
        return this.pieceQueue.shift();
    },

    createPiece() {
        const type = this.getSmartPiece();
        const shape = this.SHAPES[type].map(row => [...row]);
        return {
            type,
            shape,
            x: Math.floor((this.COLS - shape[0].length) / 2),
            y: 0,
            color: GameAuth.isSpecialMode() ? this.SPECIAL_COLORS[type] : this.COLORS[type]
        };
    },

    getSmartPiece() {
        if (GameAuth.isSpecialMode()) {
            const rand = Math.random();
            if (rand < 0.45) return 'I';
            if (rand < 0.85) return 'O';
            if (rand < 0.90) return 'L';
            if (rand < 0.95) return 'J';
            return 'T';
        }

        const neededType = this.analyzeBoardNeeds();
        if (neededType && Math.random() < 0.3) {
            return neededType;
        }

        const rand = Math.random();
        if (rand < 0.15) return 'I';
        if (rand < 0.30) return 'O';
        if (rand < 0.45) return 'T';
        if (rand < 0.60) return 'S';
        if (rand < 0.75) return 'Z';
        if (rand < 0.85) return 'J';
        return 'L';
    },

    analyzeBoardNeeds() {
        let hasHole = false;
        let maxHeight = 0;
        let leftHeight = 0;
        let rightHeight = 0;

        for (let x = 0; x < this.COLS; x++) {
            let height = 0;
            for (let y = 0; y < this.ROWS; y++) {
                if (this.board[y][x]) {
                    height = this.ROWS - y;
                    break;
                }
            }
            if (x < this.COLS / 2) leftHeight += height;
            else rightHeight += height;
            maxHeight = Math.max(maxHeight, height);
        }

        for (let x = 0; x < this.COLS; x++) {
            let foundBlock = false;
            for (let y = 0; y < this.ROWS; y++) {
                if (this.board[y][x]) foundBlock = true;
                if (foundBlock && !this.board[y][x]) {
                    hasHole = true;
                    break;
                }
            }
            if (hasHole) break;
        }

        if (maxHeight > 15) return 'I';
        if (hasHole) return 'I';
        if (leftHeight > rightHeight + 20) return 'L';
        if (rightHeight > leftHeight + 20) return 'J';
        if (maxHeight > 12) return 'I';

        return null;
    },

    startGameLoop() {
        const loop = (timestamp) => {
            if (!this.isPlaying || this.gameOver) return;

            if (!this.isPaused) {
                if (timestamp - this.lastDropTime > this.dropInterval) {
                    this.drop();
                    this.lastDropTime = timestamp;
                }
                this.draw();
            }

            this.gameLoopId = requestAnimationFrame(loop);
        };
        this.gameLoopId = requestAnimationFrame(loop);
    },

    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    },

    draw() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();
        this.drawBoard();
        this.drawGhost();
        this.drawPiece();
    },

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(i * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= this.ROWS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, i * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    },

    drawBoard() {
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
    },

    drawPiece() {
        if (!this.currentPiece) return;

        const { shape, x, y, color } = this.currentPiece;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    this.drawBlock(x + col, y + row, color);
                }
            }
        }
    },

    drawGhost() {
        if (!this.currentPiece) return;

        const ghostY = this.getGhostY();
        const { shape, x } = this.currentPiece;

        this.ctx.globalAlpha = 0.3;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    this.drawBlock(x + col, ghostY + row, this.currentPiece.color);
                }
            }
        }
        this.ctx.globalAlpha = 1;
    },

    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (this.isValid(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    },

    drawBlock(x, y, color) {
        const padding = 2;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.BLOCK_SIZE + padding,
            y * this.BLOCK_SIZE + padding,
            this.BLOCK_SIZE - padding * 2,
            this.BLOCK_SIZE - padding * 2
        );

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(
            x * this.BLOCK_SIZE + padding,
            y * this.BLOCK_SIZE + padding,
            this.BLOCK_SIZE - padding * 2,
            4
        );

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(
            x * this.BLOCK_SIZE + padding,
            y * this.BLOCK_SIZE + this.BLOCK_SIZE - padding - 4,
            this.BLOCK_SIZE - padding * 2,
            4
        );
    },

    drawNextPiece() {
        const canvas = document.getElementById('nextCanvas');
        if (!canvas || !this.nextPiece) return;

        const ctx = canvas.getContext('2d');
        const size = 20;
        const padding = 5;
        const piecesToShow = Math.min(3, 1 + this.pieceQueue.length);
        
        canvas.width = 120;
        canvas.height = piecesToShow * 40 + padding * 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pieces = [this.nextPiece, ...this.pieceQueue.slice(0, piecesToShow - 1)];
        
        pieces.forEach((piece, index) => {
            if (!piece) return;
            const { shape, color } = piece;
            const offsetX = (canvas.width - shape[0].length * size) / 2;
            const offsetY = padding + index * 40 + (40 - shape.length * size) / 2;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        ctx.fillStyle = color;
                        ctx.globalAlpha = index === 0 ? 1 : 0.6 - index * 0.15;
                        ctx.fillRect(
                            offsetX + col * size + 1,
                            offsetY + row * size + 1,
                            size - 2,
                            size - 2
                        );
                    }
                }
            }
        });
        ctx.globalAlpha = 1;
    },

    drawHoldPiece() {
        const canvas = document.getElementById('holdCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = 25;
        canvas.width = 120;
        canvas.height = 100;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.holdPiece) return;

        const { shape, color } = this.holdPiece;
        const offsetX = (canvas.width - shape[0].length * size) / 2;
        const offsetY = (canvas.height - shape.length * size) / 2;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        offsetX + col * size + 2,
                        offsetY + row * size + 2,
                        size - 4,
                        size - 4
                    );
                }
            }
        }

        if (!this.canHold) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },

    isValid(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;

                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
                        return false;
                    }

                    if (newY >= 0 && this.board[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    move(dir, isRepeat = false) {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;

        if (this.isValid(this.currentPiece.shape, this.currentPiece.x + dir, this.currentPiece.y)) {
            this.currentPiece.x += dir;
            this.draw();
            if (!isRepeat) {
                AudioManager.playMove();
            }
        }
    },

    rotate() {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;

        const rotated = this.rotateMatrix(this.currentPiece.shape);
        if (this.isValid(rotated, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.shape = rotated;
            this.draw();
            AudioManager.playRotate();
        } else {
            for (const offset of [-1, 1, -2, 2]) {
                if (this.isValid(rotated, this.currentPiece.x + offset, this.currentPiece.y)) {
                    this.currentPiece.x += offset;
                    this.currentPiece.shape = rotated;
                    this.draw();
                    AudioManager.playRotate();
                    return;
                }
            }
        }
    },

    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[col][rows - 1 - row] = matrix[row][col];
            }
        }
        return rotated;
    },

    drop() {
        if (!this.isValid(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.lock();
            return;
        }

        this.currentPiece.y++;
    },

    softDrop(isRepeat = false) {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;
        this.drop();
        this.score += 1;
        this.draw();
        if (!isRepeat) {
            AudioManager.playSoftDrop();
        }
    },

    hardDrop() {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;

        let dropDistance = 0;
        while (this.isValid(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.lock();
        AudioManager.playDrop();
    },

    hold() {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;
        if (!this.canHold) return;

        const temp = this.holdPiece;
        this.holdPiece = {
            type: this.currentPiece.type,
            shape: this.SHAPES[this.currentPiece.type].map(row => [...row]),
            x: Math.floor((this.COLS - this.SHAPES[this.currentPiece.type][0].length) / 2),
            y: 0,
            color: this.currentPiece.color
        };

        if (temp) {
            this.currentPiece = temp;
            this.currentPiece.x = Math.floor((this.COLS - this.currentPiece.shape[0].length) / 2);
            this.currentPiece.y = 0;
        } else {
            this.currentPiece = this.getNextPiece();
        }

        this.canHold = false;
        this.drawHoldPiece();
        this.draw();
        AudioManager.playMove();
    },

    lock() {
        const { shape, x, y, color } = this.currentPiece;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardY = y + row;
                    if (boardY < 0) {
                        this.endGame();
                        return;
                    }
                    this.board[boardY][x + col] = color;
                }
            }
        }

        this.canHold = true;
        this.clearLines();
        this.spawnNewPiece();
    },

    clearLines() {
        let linesCleared = 0;

        for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.COLS).fill(0));
                linesCleared++;
                y++;
            }
        }

        if (linesCleared > 0) {
            this.combo++;
            const baseScore = GameAuth.isSpecialMode() ? 2 : 1;
            const comboBonus = Math.min(this.combo, 5);
            const points = [0, 100, 300, 500, 800, 1200][linesCleared] * baseScore * comboBonus;

            this.score += points;
            this.lines += linesCleared;

            GameStorage.addScore(points);
            GameStorage.addCoins(Math.floor(points / 10));
            GameStorage.addLines(linesCleared);

            AudioManager.playClear(linesCleared);
            this.showKillStreak(linesCleared);

            if (GameStorage.checkLevelUp()) {
                setTimeout(() => this.showLevelUp(), 500);
            }

            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 80);

            this.updateUI();
        } else {
            this.combo = 0;
        }
    },

    showKillStreak(linesCleared) {
        const streakEl = document.getElementById('killStreak');
        if (!streakEl) return;

        const combo = this.combo;

        let displayText = '';
        let displayClass = '';
        
        if (linesCleared >= 5) {
            displayText = '五杀!';
            displayClass = 'penta';
            AudioManager.playPenta();
            GameStorage.addScore(10);
            GameStorage.addCoins(5);
            this.score += 10;
        } else if (linesCleared >= 4) {
            displayText = '四杀!';
            displayClass = 'quadra';
            AudioManager.playQuadra();
        } else if (linesCleared >= 3) {
            displayText = '三杀!';
            displayClass = 'triple';
            AudioManager.playTriple();
        } else if (linesCleared >= 2) {
            displayText = '双杀!';
            displayClass = 'double';
            AudioManager.playDouble();
        } else {
            displayText = '一杀!';
            displayClass = 'first-blood';
            AudioManager.playFirstBlood();
        }

        if (combo >= 8) {
            displayText = '🔥 超神! ' + displayText;
            displayClass = 'legendary';
            AudioManager.playLegendary();
            GameStorage.addScore(20);
            GameStorage.addCoins(10);
            this.score += 20;
        } else if (combo >= 5) {
            displayText = '⚡ 五连击! ' + displayText;
        } else if (combo >= 3) {
            displayText = '✨ 三连击! ' + displayText;
        }

        streakEl.className = `kill-streak ${displayClass}`;
        streakEl.textContent = displayText;

        streakEl.classList.add('show');
        setTimeout(() => {
            streakEl.classList.remove('show');
        }, 1500);
    },

    showLevelUp() {
        const overlay = document.getElementById('levelUpOverlay');
        const levelEl = document.getElementById('newLevel');
        const rewardEl = document.getElementById('levelReward');

        if (!overlay) return;

        const newLevel = GameStorage.data.level;
        levelEl.textContent = `Lv.${newLevel}`;
        rewardEl.textContent = `奖励 ${newLevel * 50} 积分`;

        GameStorage.addCoins(newLevel * 50);
        this.updateUI();

        overlay.classList.add('show');
        AudioManager.playLevelUp();

        setTimeout(() => {
            overlay.classList.remove('show');
        }, 3000);
    },

    spawnNewPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getNextPiece();
        this.drawNextPiece();

        if (!this.isValid(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.endGame();
        }
    },

    endGame() {
        this.gameOver = true;
        this.isPlaying = false;
        this.stopGameLoop();
        this.combo = 0;
        this.keysPressed = {};
        this.stopRepeatMove();

        GameStorage.addGame();

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverOverlay').classList.add('show');

        AudioManager.playGameOver();
    },

    useRevive() {
        if (GameStorage.useReviveCard()) {
            this.gameOver = false;
            this.isPlaying = true;
            document.getElementById('gameOverOverlay').classList.remove('show');

            for (let y = 0; y < 5; y++) {
                this.board[y] = Array(this.COLS).fill(0);
            }

            this.currentPiece = this.getNextPiece();
            this.canHold = true;
            this.startGameLoop();
            this.updateUI();
            AudioManager.playItemUse();
            return true;
        }
        return false;
    },

    useDestroy() {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;
        if (!GameStorage.useDestroyCard()) return;

        const rowsToDestroy = 3;
        const startRow = this.ROWS - rowsToDestroy;
        
        for (let y = startRow; y < this.ROWS; y++) {
            this.board[y] = Array(this.COLS).fill(0);
        }
        
        for (let y = startRow - 1; y >= 0; y--) {
            this.board[y + rowsToDestroy] = [...this.board[y]];
            this.board[y] = Array(this.COLS).fill(0);
        }

        this.draw();
        AudioManager.playItemUse();
        this.updateUI();
    },

    updateUI() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('linesValue').textContent = this.lines;
        document.getElementById('levelValue').textContent = this.level;

        const data = GameStorage.getData();
        document.getElementById('totalScore').textContent = data.totalScore;
        document.getElementById('playerLevel').textContent = `Lv.${data.level}`;
        document.getElementById('coinsValue').textContent = data.coins;
        document.getElementById('reviveCount').textContent = GameStorage.isDevMode ? '∞' : data.reviveCards;
        document.getElementById('destroyCount').textContent = GameStorage.isDevMode ? '∞' : data.destroyCards;
        document.getElementById('highScore').textContent = data.highScore;
        document.getElementById('gamesPlayed').textContent = data.gamesPlayed;

        document.getElementById('reviveBtn').disabled = !GameStorage.isDevMode && data.reviveCards === 0;
        document.getElementById('destroyBtn').disabled = !GameStorage.isDevMode && data.destroyCards === 0;
    },

    handleKeyDown(e) {
        try {
            if (e.target && e.target.tagName === 'INPUT') return;

            if (!this.isPlaying && !this.gameOver) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.start();
                }
                return;
            }

            if (this.gameOver) {
                if (e.key === 'r' || e.key === 'R') {
                    this.restart();
                }
                return;
            }

            if (this.isPaused) {
                if (e.key === 'p' || e.key === 'P') {
                    this.togglePause();
                }
                return;
            }

            const key = e.key;
            
            if (this.keysPressed[key]) return;
            this.keysPressed[key] = true;

            switch (key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.stopRepeatMove();
                    this.move(-1);
                    this.startRepeatMove(-1);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.stopRepeatMove();
                    this.move(1);
                    this.startRepeatMove(1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.stopRepeatMove();
                    this.softDrop();
                    this.startRepeatDrop();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.rotate();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'Shift':
                    e.preventDefault();
                    this.hold();
                    break;
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
            }
        } catch (err) {
            console.error('handleKeyDown error:', err);
            this.emergencyReset();
        }
    },

    handleKeyUp(e) {
        const key = e.key;
        this.keysPressed[key] = false;
        this.keysPressed[key.toLowerCase()] = false;
        this.keysPressed[key.toUpperCase()] = false;
        
        if (!this.keysPressed['ArrowLeft'] && !this.keysPressed['a'] && !this.keysPressed['A'] &&
            !this.keysPressed['ArrowRight'] && !this.keysPressed['d'] && !this.keysPressed['D'] &&
            !this.keysPressed['ArrowDown'] && !this.keysPressed['s'] && !this.keysPressed['S']) {
            this.stopRepeatMove();
        }
    },

    startRepeatMove(dir) {
        this.stopRepeatMove();
        this.repeatDir = dir;
        this.isRepeatingMove = true;
        
        this.repeatTimeout = setTimeout(() => {
            if (!this.isRepeatingMove || this.repeatDir !== dir) return;
            
            const isLeftPressed = this.keysPressed['ArrowLeft'] || this.keysPressed['a'] || this.keysPressed['A'];
            const isRightPressed = this.keysPressed['ArrowRight'] || this.keysPressed['d'] || this.keysPressed['D'];
            
            if ((dir === -1 && isLeftPressed) || (dir === 1 && isRightPressed)) {
                this.moveRepeatInterval = setInterval(() => {
                    if (!this.isRepeatingMove || this.repeatDir !== dir) {
                        this.stopRepeatMove();
                        return;
                    }
                    if (this.isPlaying && !this.gameOver && !this.isPaused) {
                        this.move(dir, true);
                    } else {
                        this.stopRepeatMove();
                    }
                }, this.repeatMoveDelay);
            } else {
                this.isRepeatingMove = false;
                this.repeatDir = 0;
            }
        }, this.initialMoveDelay);
    },

    startRepeatDrop() {
        this.stopRepeatMove();
        this.repeatDir = 0;
        this.isRepeatingMove = true;
        
        this.repeatTimeout = setTimeout(() => {
            if (!this.isRepeatingMove) return;
            
            const isDownPressed = this.keysPressed['ArrowDown'] || this.keysPressed['s'] || this.keysPressed['S'];
            
            if (isDownPressed) {
                this.moveRepeatInterval = setInterval(() => {
                    if (!this.isRepeatingMove) {
                        this.stopRepeatMove();
                        return;
                    }
                    if (this.isPlaying && !this.gameOver && !this.isPaused) {
                        this.softDrop(true);
                    } else {
                        this.stopRepeatMove();
                    }
                }, this.repeatMoveDelay);
            } else {
                this.isRepeatingMove = false;
            }
        }, this.initialMoveDelay);
    },

    stopRepeatMove() {
        if (this.repeatTimeout) {
            clearTimeout(this.repeatTimeout);
            this.repeatTimeout = null;
        }
        if (this.moveRepeatInterval) {
            clearInterval(this.moveRepeatInterval);
            this.moveRepeatInterval = null;
        }
        this.isRepeatingMove = false;
        this.repeatDir = 0;
    },

    emergencyReset() {
        this.stopRepeatMove();
        this.keysPressed = {};
        this.isRepeatingMove = false;
        this.repeatDir = 0;
        if (this.isPlaying && !this.gameOver) {
            this.draw();
        }
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.stopRepeatMove();
            this.keysPressed = {};
        }
    },

    restart() {
        this.stopGameLoop();
        document.getElementById('gameOverOverlay').classList.remove('show');
        document.getElementById('startOverlay').classList.remove('hidden');
        this.isPlaying = false;
        this.init('gameCanvas');
    },

    handleTouchStart(dir) {
        if (!this.isPlaying || this.gameOver || this.isPaused) return;
        if (dir === 0) {
            this.softDrop();
            this.startRepeatDrop();
        } else {
            this.stopRepeatMove();
            this.move(dir);
            this.startRepeatMove(dir);
        }
    },

    handleTouchEnd() {
        this.stopRepeatMove();
    }
};

document.addEventListener('keydown', (e) => TetrisGame.handleKeyDown(e));
document.addEventListener('keyup', (e) => TetrisGame.handleKeyUp(e));

document.addEventListener('DOMContentLoaded', () => {
    let touchHandled = false;
    
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
        const leftBtn = mobileControls.querySelector('.left-btn');
        const rightBtn = mobileControls.querySelector('.right-btn');
        const dropBtn = mobileControls.querySelector('.drop-btn');
        const rotateBtn = mobileControls.querySelector('.rotate-btn');
        const holdBtn = mobileControls.querySelector('.hold-btn');
        const hardDropBtn = mobileControls.querySelector('.hard-drop-btn');
        const pauseBtn = mobileControls.querySelector('.pause-btn');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
                TetrisGame.handleTouchStart(-1);
            }, { passive: false });
            leftBtn.addEventListener('touchend', () => {
                TetrisGame.handleTouchEnd();
                setTimeout(() => { touchHandled = false; }, 100);
            });
            leftBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.move(-1);
                }
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
                TetrisGame.handleTouchStart(1);
            }, { passive: false });
            rightBtn.addEventListener('touchend', () => {
                TetrisGame.handleTouchEnd();
                setTimeout(() => { touchHandled = false; }, 100);
            });
            rightBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.move(1);
                }
            });
        }
        
        if (dropBtn) {
            dropBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
                TetrisGame.handleTouchStart(0);
            }, { passive: false });
            dropBtn.addEventListener('touchend', () => {
                TetrisGame.handleTouchEnd();
                setTimeout(() => { touchHandled = false; }, 100);
            });
            dropBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.softDrop();
                }
            });
        }
        
        if (rotateBtn) {
            rotateBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
            }, { passive: false });
            rotateBtn.addEventListener('touchend', () => {
                setTimeout(() => { touchHandled = false; }, 100);
            });
            rotateBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.rotate();
                }
            });
        }
        
        if (holdBtn) {
            holdBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
            }, { passive: false });
            holdBtn.addEventListener('touchend', () => {
                setTimeout(() => { touchHandled = false; }, 100);
            });
            holdBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.hold();
                }
            });
        }
        
        if (hardDropBtn) {
            hardDropBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
            }, { passive: false });
            hardDropBtn.addEventListener('touchend', () => {
                setTimeout(() => { touchHandled = false; }, 100);
            });
            hardDropBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.hardDrop();
                }
            });
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchHandled = true;
            }, { passive: false });
            pauseBtn.addEventListener('touchend', () => {
                setTimeout(() => { touchHandled = false; }, 100);
            });
            pauseBtn.addEventListener('click', () => {
                if (!touchHandled) {
                    TetrisGame.togglePause();
                }
            });
        }
    }
});

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (typeof TetrisGame !== 'undefined' && TetrisGame.emergencyReset) {
        TetrisGame.emergencyReset();
    }
});

setInterval(() => {
    if (typeof TetrisGame !== 'undefined' && TetrisGame.isRepeatingMove) {
        const hasActiveKey = TetrisGame.keysPressed['ArrowLeft'] || TetrisGame.keysPressed['a'] || TetrisGame.keysPressed['A'] ||
                           TetrisGame.keysPressed['ArrowRight'] || TetrisGame.keysPressed['d'] || TetrisGame.keysPressed['D'] ||
                           TetrisGame.keysPressed['ArrowDown'] || TetrisGame.keysPressed['s'] || TetrisGame.keysPressed['S'];
        if (!hasActiveKey && !TetrisGame.isPaused) {
            TetrisGame.emergencyReset();
        }
    }
}, 500);
