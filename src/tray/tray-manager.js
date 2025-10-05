const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const log = require('../utils/logger');
const config = require('../config/default-config');

class TrayManager {
    constructor() {
        this.tray = null;
    }

    create() {
        try {
            const iconPath = path.join(__dirname, '../../build/icon.ico');
            let trayIcon;
            
            try {
                trayIcon = nativeImage.createFromPath(iconPath);
                if (trayIcon.isEmpty()) {
                    trayIcon = this.createDefaultIcon();
                }
            } catch (error) {
                trayIcon = this.createDefaultIcon();
            }
            
            this.tray = new Tray(trayIcon);
            this.tray.setToolTip(config.tray?.tooltip || 'Aapillo Auth Service');
            this.createContextMenu();
            
            log.info('System tray created successfully');
        } catch (error) {
            log.error('Failed to create system tray:', error);
            throw error;
        }
    }

    createDefaultIcon() {
        const size = 16;
        const canvas = require('canvas').createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('A', 4, 12);
        
        return nativeImage.createFromDataURL(canvas.toDataURL());
    }

    createContextMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Aapillo Auth',
                enabled: false,
                icon: nativeImage.createEmpty()
            },
            { type: 'separator' },
            {
                label: 'Status',
                submenu: [
                    {
                        label: '● Service Running',
                        type: 'checkbox',
                        checked: true,
                        enabled: false
                    },
                    { type: 'separator' },
                    {
                        label: 'View Logs',
                        click: () => {
                            this.openLogsFolder();
                        }
                    },
                    {
                        label: 'Refresh',
                        click: () => {
                            this.updateStatus(true);
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Configuration',
                click: () => {
                    this.openConfiguration();
                }
            },
            { type: 'separator' },
            {
                label: 'About',
                click: () => {
                    this.showAbout();
                }
            },
            {
                label: 'Exit Service',
                click: () => {
                    log.info('Exit requested from tray menu');
                    app.quit();
                }
            }
        ]);
        
        this.tray.setContextMenu(contextMenu);
    }

    openLogsFolder() {
        const { shell } = require('electron');
        const logPath = config.app?.logPath || path.join(process.env.PROGRAMDATA, 'AapilloAuth', 'logs');
        shell.openPath(logPath).catch(error => {
            log.error('Failed to open logs folder:', error);
        });
    }

    openConfiguration() {
        log.info('Opening configuration window from tray');
        app.emit('open-config-window');
    }

    showAbout() {
        const { dialog } = require('electron');
        dialog.showMessageBox({
            type: 'info',
            title: 'About Aapillo Auth',
            message: 'Aapillo Authentication Service',
            detail: `Version: ${config.app?.version || '1.0.0'}\n\nEnterprise authentication system with OTP verification.\n\n© 2025 Aapillo. All rights reserved.`,
            buttons: ['OK']
        });
    }

    updateStatus(isRunning) {
        if (this.tray) {
            const tooltip = isRunning ? 
                'Aapillo Auth - Running' : 
                'Aapillo Auth - Stopped';
            this.tray.setToolTip(tooltip);
            
            this.createContextMenu();
        }
    }

    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            log.info('System tray destroyed');
        }
    }
}

module.exports = TrayManager;