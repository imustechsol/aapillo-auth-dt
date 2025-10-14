
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('./utils/logger');
const AuthService = require('./service/auth-service');
const ConfigWindow = require('./windows/config-window');
const OTPWindow = require('./windows/otp-window');
const ConfigManager = require('./config/config-manager');
const UserManager = require('./service/user-manager');
const WindowsAPI = require('./utils/windows-api');

console.log("Main process loaded..");

class AapilloAuthApp {
    constructor() {
        this.authService = null;
        this.configWindow = null;
        this.otpWindow = null;
        this.configManager = new ConfigManager();
        this.userManager = new UserManager();
        this.isFirstRun = false;
    }

    async initialize() {
        console.log("initialized");
        try {
            log.info('Initializing Aapillo Auth system...');

            if (process.argv.includes('--dev')) {
                await this.showConfigWindow();
                return;
            }

            // Check if this is first run (no config exists)
            this.isFirstRun = await this.configManager.isFirstRun();

            if (this.isFirstRun || process.argv.includes('--config')) {
                // Show configuration window for admin setup
                await this.showConfigWindow();
            } else {
                // Start background service
                await this.startBackgroundService();
            }

        } catch (error) {
            log.error('Failed to initialize application:', error);
            this.showErrorDialog('Initialization Error', error.message);
        }
    }

    async showConfigWindow() {
        try {
            // Verify admin privileges
            /* if (!await WindowsAPI.isRunningAsAdmin()) {
                log.error('Administrator privileges required for configuration');
                throw new Error('Administrator privileges required for configuration');
            } */

            this.configWindow = new ConfigWindow(this.configManager, this.userManager);
            await this.configWindow.create();

            log.info('Configuration window opened');
        } catch (error) {
            log.error('Failed to open config window:', error);
            throw error;
        }
    }

    async startBackgroundService() {
        try {
            log.info('Starting background authentication service...');

            this.authService = new AuthService(this.configManager, this.userManager);
            await this.authService.start();

            // Hide from taskbar - run completely in background
            app.dock?.hide();

            log.info('Background service started successfully');
        } catch (error) {
            log.error('Failed to start background service:', error);
            throw error;
        }
    }

    async showOTPWindow(userId, userConfig) {
        try {
            if (this.otpWindow) {
                this.otpWindow.focus();
                return;
            }

            this.otpWindow = new OTPWindow(userId, userConfig, this.configManager);
            await this.otpWindow.create();

            this.otpWindow.on('closed', () => {
                this.otpWindow = null;
            });

            log.info(`OTP window shown for user: ${userId}`);
        } catch (error) {
            log.error('Failed to show OTP window:', error);
        }
    }

    showErrorDialog(title, message) {
        dialog.showErrorBox(title, message);
    }

    async shutdown() {
        try {
            log.info('Shutting down Aapillo Auth...');

            if (this.authService) {
                await this.authService.stop();
            }

            if (this.configWindow) {
                this.configWindow.destroy();
            }

            if (this.otpWindow) {
                this.otpWindow.destroy();
            }

            log.info('Shutdown complete');
        } catch (error) {
            log.error('Error during shutdown:', error);
        }
    }
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log("Another instance is running. Quitting this one.");
    app.quit();
} else {
    const aapilloApp = new AapilloAuthApp();

    // Set up IPC handlers
    ipcMain.handle('get-system-users', async () => {
        return await aapilloApp.userManager.getSystemUsers();
    });
    
    ipcMain.handle('save-user-config', async (event, userId, config) => {
        return await aapilloApp.userManager.saveUserConfig(userId, config);
    });
    
    ipcMain.handle('get-user-config', async (event, userId) => {
        return await aapilloApp.userManager.getUserConfig(userId);
    });
    
    ipcMain.handle('save-master-config', async (event, config) => {
        return await aapilloApp.configManager.saveMasterConfig(config);
    });
    
    ipcMain.handle('export-config', async () => {
        return await aapilloApp.configManager.exportConfig();
    });
    
    ipcMain.handle('import-config', async (event, configData) => {
        return await aapilloApp.configManager.importConfig(configData);
    });
    
    ipcMain.handle('verify-otp', async (event, userId, otp) => {
        return await aapilloApp.authService.verifyOTP(userId, otp);
    });
    
    ipcMain.handle('request-otp', async (event, userId) => {
        return await aapilloApp.authService.requestOTP(userId);
    });

    app.whenReady().then(async () => {
        try {
            console.log("started");
            // const mainWindow = new BrowserWindow({ width: 800, height: 600 });
            // await mainWindow.loadFile('src/renderer/config.html');
            await aapilloApp.initialize();
            console.log("initialized");
        } catch (e) {
            console.error("Error in app.whenReady:", e);
        }
    });

    app.on('second-instance', () => {
        if (aapilloApp.configWindow) {
            aapilloApp.configWindow.focus();
        }
    });

    /* app.on('second-instance', (event, commandLine, workingDirectory) => {
        // This runs if a second instance is opened
        // You can focus your existing window here
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    }); */

    app.on('window-all-closed', (event) => {
        // Don't quit app when all windows closed - keep running in background
        event.preventDefault();
    });

    app.on('before-quit', async () => {
        await aapilloApp.shutdown();
    });
}