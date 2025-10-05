const { BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('../utils/logger');

class ConfigWindow {
    constructor(configManager, userManager) {
        this.configManager = configManager;
        this.userManager = userManager;
        this.window = null;
    }

    async create() {
        try {
            /* console.log("Creating ConfigWindow...");
            this.window = new BrowserWindow({
                width: 1000,
                height: 700,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                },
                resizable: false,
                maximizable: false,
                show: false,
                title: 'Aapillo Auth - Configuration'
            });

            await this.window.loadFile(path.join(__dirname, '../renderer/config.html'));

            this.window.once('ready-to-show', () => {
                this.window.show();
                this.window.focus();
            });

            this.window.on('closed', () => {
                this.window = null;
            });

            this.setupIPC(); */
            this.window.loadURL("data:text/html,<h1>Hello from Config Window</h1>");

        } catch (error) {
            log.error('Failed to create config window:', error);
            throw error;
        }
    }

    setupIPC() {
        // Handle config window specific IPC events
        ipcMain.handle('config-save-master', async (event, masterConfig) => {
            return await this.configManager.saveMasterConfig(masterConfig);
        });

        ipcMain.handle('config-load-master', async (event, password) => {
            return await this.configManager.loadMasterConfig(password);
        });

        ipcMain.handle('config-export', async () => {
            const result = await this.configManager.exportConfig();
            if (result.success) {
                const { filePath } = await dialog.showSaveDialog(this.window, {
                    title: 'Export Configuration',
                    defaultPath: 'aapillo-auth-config.aac',
                    filters: [
                        { name: 'Aapillo Auth Config', extensions: ['aac'] }
                    ]
                });

                if (filePath) {
                    const fs = require('fs').promises;
                    await fs.writeFile(filePath, result.data);
                    return { success: true, message: 'Configuration exported successfully' };
                }
            }
            return result;
        });

        ipcMain.handle('config-import', async () => {
            const { filePaths } = await dialog.showOpenDialog(this.window, {
                title: 'Import Configuration',
                filters: [
                    { name: 'Aapillo Auth Config', extensions: ['aac'] }
                ],
                properties: ['openFile']
            });

            if (filePaths && filePaths.length > 0) {
                const fs = require('fs').promises;
                const configData = await fs.readFile(filePaths[0], 'utf8');
                return await this.configManager.importConfig(configData);
            }

            return { success: false, error: 'No file selected' };
        });
    }

    focus() {
        if (this.window) {
            this.window.focus();
        }
    }

    destroy() {
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
    }
}

module.exports = ConfigWindow;