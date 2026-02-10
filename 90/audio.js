const AudioManager = {
    audioContext: null,
    enabled: true,
    soundEnabled: true,
    musicEnabled: false,
    volume: 0.5,
    musicVolume: 0.3,
    musicOscillator: null,
    musicGain: null,

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API 不支持');
            this.enabled = false;
        }
        
        const savedSound = localStorage.getItem('soundEnabled');
        const savedMusic = localStorage.getItem('musicEnabled');
        if (savedSound !== null) this.soundEnabled = savedSound === 'true';
        if (savedMusic !== null) this.musicEnabled = savedMusic === 'true';
    },

    playTone(frequency, duration, type = 'sine', volumeMultiplier = 1) {
        if (!this.enabled || !this.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(
                this.volume * volumeMultiplier,
                this.audioContext.currentTime
            );
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {}
    },

    playMove() {
        this.playTone(400, 0.05, 'sine', 0.15);
    },

    playSoftDrop() {
        this.playTone(300, 0.05, 'sine', 0.1);
    },

    playRotate() {
        this.playTone(500, 0.08, 'sine', 0.2);
    },

    playDrop() {
        this.playTone(300, 0.12, 'triangle', 0.25);
    },

    playClear(lines = 1) {
        const baseFreq = 523;
        const duration = 0.12;
        
        for (let i = 0; i < lines; i++) {
            setTimeout(() => {
                this.playTone(baseFreq + i * 150, duration, 'sine', 0.3);
            }, i * 60);
        }
    },

    playFirstBlood() {
        const notes = [523, 659];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.35), i * 80);
        });
    },

    playDouble() {
        const notes = [523, 659, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 'sine', 0.35), i * 70);
        });
    },

    playTriple() {
        const notes = [523, 659, 784, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.4), i * 60);
        });
    },

    playQuadra() {
        const notes = [523, 659, 784, 880, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.4), i * 50);
        });
    },

    playPenta() {
        const notes = [523, 659, 784, 880, 1047, 1175];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.45), i * 50);
        });
    },

    playLegendary() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.25, 'sine', 0.5);
                this.playTone(freq * 1.5, 0.25, 'sine', 0.3);
            }, i * 120);
        });
    },

    playLevelUp() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.2, 'sine', 0.4);
            }, i * 100);
        });
        setTimeout(() => {
            this.playTone(1047, 0.4, 'sine', 0.5);
            this.playTone(1319, 0.4, 'sine', 0.35);
        }, notes.length * 100);
    },

    playGameOver() {
        const notes = [392, 349, 330, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.25, 'triangle', 0.35), i * 180);
        });
    },

    playClick() {
        this.playTone(600, 0.05, 'sine', 0.2);
    },

    playSuccess() {
        const notes = [523, 659];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 'sine', 0.35), i * 100);
        });
    },

    playError() {
        this.playTone(250, 0.15, 'triangle', 0.3);
    },

    playPurchase() {
        const notes = [523, 659];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.35), i * 60);
        });
    },

    playItemUse() {
        this.playTone(523, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.12, 'sine', 0.3), 60);
    },

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    },

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },

    startMusic() {
        if (!this.enabled || !this.musicEnabled || !this.audioContext) return;
        if (this.musicOscillator) return;

        try {
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.audioContext.destination);
            this.musicGain.gain.value = this.musicVolume * 0.08;

            this.playMusicLoop();
        } catch (e) {}
    },

    playMusicLoop() {
        if (!this.musicEnabled) return;
        
        const melody = [
            { freq: 523, dur: 300 },
            { freq: 587, dur: 300 },
            { freq: 659, dur: 400 },
            { freq: 698, dur: 300 },
            { freq: 784, dur: 300 },
            { freq: 698, dur: 400 },
            { freq: 659, dur: 300 },
            { freq: 587, dur: 300 },
            { freq: 523, dur: 600 },
            { freq: 0, dur: 200 },
            { freq: 392, dur: 300 },
            { freq: 440, dur: 300 },
            { freq: 523, dur: 400 },
            { freq: 440, dur: 300 },
            { freq: 392, dur: 300 },
            { freq: 349, dur: 600 },
            { freq: 0, dur: 200 },
            { freq: 523, dur: 250 },
            { freq: 659, dur: 250 },
            { freq: 784, dur: 500 },
            { freq: 659, dur: 250 },
            { freq: 523, dur: 250 },
            { freq: 440, dur: 500 },
            { freq: 392, dur: 500 },
            { freq: 349, dur: 500 },
            { freq: 0, dur: 300 },
            { freq: 440, dur: 300 },
            { freq: 523, dur: 300 },
            { freq: 587, dur: 300 },
            { freq: 659, dur: 400 },
            { freq: 587, dur: 300 },
            { freq: 523, dur: 300 },
            { freq: 440, dur: 600 },
            { freq: 0, dur: 400 }
        ];
        
        let totalTime = 0;
        melody.forEach((note, i) => {
            setTimeout(() => {
                if (!this.musicEnabled) return;
                if (note.freq === 0) return;
                
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = note.freq;
                osc.type = 'triangle';
                gain.gain.setValueAtTime(this.musicVolume * 0.12, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + note.dur / 1000);
                osc.start();
                osc.stop(this.audioContext.currentTime + note.dur / 1000);
            }, totalTime);
            totalTime += note.dur;
        });

        setTimeout(() => {
            if (this.musicEnabled) {
                this.playMusicLoop();
            }
        }, totalTime + 800);
    },

    stopMusic() {
        this.musicEnabled = false;
        if (this.musicOscillator) {
            try {
                this.musicOscillator.stop();
            } catch (e) {}
            this.musicOscillator = null;
        }
        if (this.musicGain) {
            this.musicGain = null;
        }
    }
};

AudioManager.init();
