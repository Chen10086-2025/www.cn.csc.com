const GameAuth = {
    _secretCode: '110',
    _triggerSequence: '100',
    _inputBuffer: [],
    _isSpecialMode: false,
    _authInitialized: false,
    _dialogOpen: false,

    init() {
        if (this._authInitialized) return;
        this._authInitialized = true;
        this._loadSettings();
        this._setupTriggerListener();
    },

    _loadSettings() {
        const savedCode = localStorage.getItem('specialModePassword');
        if (savedCode) {
            this._secretCode = savedCode;
        }
        const savedTrigger = localStorage.getItem('triggerSequence');
        if (savedTrigger) {
            this._triggerSequence = savedTrigger;
        }
    },

    setPassword(newPassword) {
        this._secretCode = newPassword;
        localStorage.setItem('specialModePassword', newPassword);
    },

    setTriggerSequence(newSequence) {
        this._triggerSequence = newSequence;
        localStorage.setItem('triggerSequence', newSequence);
    },

    getPassword() {
        return this._secretCode;
    },

    getTriggerSequence() {
        return this._triggerSequence;
    },

    _setupTriggerListener() {
        document.addEventListener('keydown', (e) => {
            if (this._isSpecialMode) return;
            if (this._dialogOpen) return;
            
            if (e.target && e.target.tagName === 'INPUT') return;
            
            if (e.key >= '0' && e.key <= '9') {
                this._inputBuffer.push(e.key);
                if (this._inputBuffer.length > 4) {
                    this._inputBuffer.shift();
                }
                
                if (this._inputBuffer.join('') === this._triggerSequence) {
                    this._showPasswordDialog();
                    this._inputBuffer = [];
                }
            }
        });
    },

    _showPasswordDialog() {
        this._dialogOpen = true;
        this._inputBuffer = [];
        
        const dialog = document.createElement('div');
        dialog.id = 'authDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(15, 15, 35, 0.98);
            padding: 40px;
            border-radius: 15px;
            border: 2px solid #00d4ff;
            box-shadow: 0 0 50px rgba(0, 212, 255, 0.5);
            z-index: 10000;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <div style="color: #00d4ff; font-size: 24px; margin-bottom: 20px; font-weight: bold;">🔐 系统认证</div>
            <input type="password" id="authPassword" placeholder="请输入授权码" 
                style="padding: 12px 20px; font-size: 18px; border: 2px solid #00d4ff; border-radius: 8px; background: #0a0a1a; color: #00d4ff; width: 200px; outline: none;"
                autocomplete="off">
            <div style="margin-top: 20px;">
                <button onclick="GameAuth._verifyPassword()" 
                    style="padding: 12px 30px; background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); color: #0f0f23; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-right: 10px;">
                    验证
                </button>
                <button onclick="GameAuth._closeDialog()" 
                    style="padding: 12px 30px; background: transparent; color: #888; border: 1px solid #444; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    取消
                </button>
            </div>
            <div id="authError" style="color: #ff4444; margin-top: 15px; font-size: 14px; display: none;">授权码错误，请重试</div>
        `;
        
        document.body.appendChild(dialog);
        
        setTimeout(() => {
            document.getElementById('authPassword').focus();
        }, 100);
        
        document.getElementById('authPassword').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this._verifyPassword();
            }
        });
    },

    _verifyPassword() {
        const input = document.getElementById('authPassword').value;
        if (input === this._secretCode) {
            this._activateSpecialMode();
            this._closeDialog();
        } else {
            const errorEl = document.getElementById('authError');
            errorEl.style.display = 'block';
            errorEl.textContent = '❌ 授权码错误，请重试';
            errorEl.style.animation = 'shake 0.5s ease-in-out';
            document.getElementById('authPassword').style.borderColor = '#ff4444';
            
            setTimeout(() => {
                errorEl.style.display = 'none';
                errorEl.style.animation = '';
                document.getElementById('authPassword').style.borderColor = '#00d4ff';
            }, 2500);
        }
    },

    _closeDialog() {
        const dialog = document.getElementById('authDialog');
        if (dialog) {
            dialog.remove();
        }
        this._dialogOpen = false;
        this._inputBuffer = [];
    },

    _activateSpecialMode() {
        this._isSpecialMode = true;
        
        const devBtn = document.getElementById('devPanelBtn');
        if (devBtn) {
            devBtn.classList.add('show');
        }
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 5px 30px rgba(76, 175, 80, 0.5);
            animation: slideDown 0.5s ease-out;
        `;
        notification.textContent = '✅ 开发者模式已激活';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
        
        if (typeof window.onSpecialModeActivated === 'function') {
            window.onSpecialModeActivated();
        }
    },

    isSpecialMode() {
        return this._isSpecialMode;
    },

    reset() {
        this._isSpecialMode = false;
        this._inputBuffer = [];
    }
};

const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

GameAuth.init();
