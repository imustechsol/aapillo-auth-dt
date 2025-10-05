const { BrowserWindow, screen } = require('electron');
const path = require('path');
const log = require('../utils/logger');

class OTPWindow {
    constructor(userId, userConfig, configManager) {
        this.userId = userId;
        this.userConfig = userConfig;
        this.configManager = configManager;
        this.window = null;
    }

    async create() {
        try {
            // Create window on primary display center
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;

            this.window = new BrowserWindow({
                width: 450,
                height: 350,
                x: Math.floor((width - 450) / 2),
                y: Math.floor((height - 350) / 2),
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                },
                resizable: false,
                maximizable: false,
                minimizable: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                show: false,
                frame: true,
                title: 'Authentication Required'
            });

            await this.window.loadFile(path.join(__dirname, '../renderer/otp.html'));
            
            // Pass user data to renderer
            this.window.webContents.once('dom-ready', () => {
                this.window.webContents.send('init-otp', {
                    userId: this.userId,
                    userConfig: this.userConfig
                });
            });

            this.window.once('ready-to-show', () => {
                this.window.show();
                this.window.focus();
                this.window.setAlwaysOnTop(true, 'screen-saver');
            });

            this.window.on('closed', () => {
                this.window = null;
            });

            // Prevent closing with Alt+F4 or X button
            this.window.on('close', (event) => {
                event.preventDefault();
                // Only allow programmatic closing
            });

        } catch (error) {
            log.error('Failed to create OTP window:', error);
            throw error;
        }
    }

    close() {
        if (this.window) {
            this.window.removeAllListeners('close');
            this.window.close();
        }
    }

    focus() {
        if (this.window) {
            this.window.focus();
            this.window.setAlwaysOnTop(true, 'screen-saver');
        }
    }

    destroy() {
        if (this.window) {
            this.window.removeAllListeners('close');
            this.window.destroy();
            this.window = null;
        }
    }
}

module.exports = OTPWindow;