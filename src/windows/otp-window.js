const { BrowserWindow } = require('electron');
const path = require('path');
const log = require('../utils/logger');
const defaultConfig = require('../config/default-config');

class OTPWindow {
    constructor(userId, userConfig, configManager) {
        this.userId = userId;
        this.userConfig = userConfig;
        this.configManager = configManager;
        this.window = null;
        this.allowClose = false;
    }

    async create() {
        try {
            // Create window on primary display center
            // const primaryDisplay = screen.getPrimaryDisplay();
            // const { width, height } = primaryDisplay.workAreaSize;
            const otpWindowInstance = this;

            this.window = new BrowserWindow({
                width: defaultConfig.ui.otpWindow.width,
                height: defaultConfig.ui.otpWindow.height,
                frame: false, //default- false
                fullscreen: true, //default- true
                alwaysOnTop: true, //default- true
                kiosk: true, //default- true
                resizable: false, //default- false
                movable: false, //default- false
                minimizable: false, //default- false
                maximizable: false, //default- false
                closable: false, //default- false
                skipTaskbar: true, //default- true
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    enableRemoteModule: false
                }
            });

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

            await this.window.loadFile(path.join(__dirname, '../renderer/otp.html'));

            this.window.on('closed', () => {
                this.window = null;
            });

            // Prevent closing with Alt+F4 or X button
            this.window.on('close', (event) => {
                if (!this.allowClose) {
                    event.preventDefault();
                }
            });

            this.window.on('close', (event) => {
                if (!otpWindowInstance.allowClose) {
                    event.preventDefault();
                }
            });

        } catch (error) {
            log.error('Failed to create OTP window:', error);
            throw error;
        }
    }

    close() {
        if (!this.window) return;

        this.allowClose = true;

        this.window.removeAllListeners();

        this.window.destroy();
        this.window = null;
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