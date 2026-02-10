const GameStorage = {
    STORAGE_KEY: 'tetris_game_data',
    DEV_STORAGE_KEY: 'tetris_dev_mode',
    
    defaultData: {
        level: 1,
        totalScore: 0,
        coins: 0,
        reviveCards: 0,
        destroyCards: 0,
        gamesPlayed: 0,
        linesCleared: 0,
        highScore: 0,
        lastPlayTime: null
    },

    data: null,
    isDevMode: false,

    init() {
        this.loadData();
        this.checkDevMode();
    },

    loadData() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.data = { ...this.defaultData, ...JSON.parse(saved) };
            } else {
                this.data = { ...this.defaultData };
            }
        } catch (e) {
            console.error('加载数据失败:', e);
            this.data = { ...this.defaultData };
        }
    },

    saveData() {
        try {
            this.data.lastPlayTime = Date.now();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    },

    addScore(score) {
        this.data.totalScore += score;
        if (score > this.data.highScore) {
            this.data.highScore = score;
        }
        this.checkLevelUp();
        this.saveData();
    },

    addCoins(coins) {
        this.data.coins += coins;
        this.saveData();
    },

    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.saveData();
            return true;
        }
        return false;
    },

    addLines(lines) {
        this.data.linesCleared += lines;
        this.saveData();
    },

    addGame() {
        this.data.gamesPlayed++;
        this.saveData();
    },

    checkLevelUp() {
        const newLevel = this.calculateLevel();
        if (newLevel > this.data.level) {
            this.data.level = newLevel;
            this.saveData();
            return true;
        }
        return false;
    },

    calculateLevel() {
        const score = this.data.totalScore;
        if (score >= 100000) return 10;
        if (score >= 50000) return 9;
        if (score >= 30000) return 8;
        if (score >= 20000) return 7;
        if (score >= 15000) return 6;
        if (score >= 10000) return 5;
        if (score >= 5000) return 4;
        if (score >= 2000) return 3;
        if (score >= 500) return 2;
        return 1;
    },

    getLevelProgress() {
        const levels = [0, 500, 2000, 5000, 10000, 15000, 20000, 30000, 50000, 100000, Infinity];
        const currentLevel = this.data.level;
        const currentMin = levels[currentLevel - 1] || 0;
        const nextLevel = levels[currentLevel] || currentMin;
        const progress = (this.data.totalScore - currentMin) / (nextLevel - currentMin) * 100;
        return Math.min(Math.max(progress, 0), 100);
    },

    useReviveCard() {
        if (this.isDevMode) return true;
        if (this.data.reviveCards > 0) {
            this.data.reviveCards--;
            this.saveData();
            return true;
        }
        return false;
    },

    useDestroyCard() {
        if (this.isDevMode) return true;
        if (this.data.destroyCards > 0) {
            this.data.destroyCards--;
            this.saveData();
            return true;
        }
        return false;
    },

    addReviveCard(count = 1) {
        this.data.reviveCards += count;
        this.saveData();
    },

    addDestroyCard(count = 1) {
        this.data.destroyCards += count;
        this.saveData();
    },

    purchaseItem(itemId, price) {
        if (this.isDevMode) {
            switch(itemId) {
                case 'revive': this.addReviveCard(); break;
                case 'destroy': this.addDestroyCard(); break;
            }
            return true;
        }
        if (this.spendCoins(price)) {
            switch(itemId) {
                case 'revive': this.addReviveCard(); break;
                case 'destroy': this.addDestroyCard(); break;
            }
            return true;
        }
        return false;
    },

    checkDevMode() {
        try {
            this.isDevMode = localStorage.getItem(this.DEV_STORAGE_KEY) === 'true';
        } catch (e) {
            this.isDevMode = false;
        }
    },

    setDevMode(enabled) {
        this.isDevMode = enabled;
        try {
            localStorage.setItem(this.DEV_STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (e) {}
    },

    editData(newData) {
        this.data = { ...this.data, ...newData };
        this.saveData();
    },

    resetData() {
        this.data = { ...this.defaultData };
        this.saveData();
    },

    getData() {
        return { ...this.data };
    }
};

GameStorage.init();
