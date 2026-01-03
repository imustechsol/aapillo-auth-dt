const { BrowserWindow } = require('electron');
const path = require('path');
const log = require('../utils/logger');

class UserPanel {
    constructor(userId, userName, userConfig) {
        this.userId = userId;
        this.userName = userName;
        this.userConfig = userConfig;
        this.window = null;
    }

    async create(parentWindow) {
        try {
            this.window = new BrowserWindow({
                width: 400,
                height: 600,
                parent: parentWindow,
                modal: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                },
                resizable: false,
                minimizable: false,
                maximizable: false,
                show: false,
                title: `Configure User: ${this.userName}`
            });

            const panelHtml = this.generatePanelHTML();
            await this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(panelHtml)}`);

            this.window.once('ready-to-show', () => {
                this.window.show();
            });

            this.window.on('closed', () => {
                this.window = null;
            });

            log.info(`User panel created for: ${this.userName}`);
        } catch (error) {
            log.error('Failed to create user panel:', error);
            throw error;
        }
    }

    generatePanelHTML() {
        const uuid = this.userConfig?.uuid || '';
        const otpSkipDuration = this.userConfig?.otpSkipDuration || 60;
        const mobileNumbers = this.userConfig?.mobileNumbers ? this.userConfig.mobileNumbers.join(', ') : '';
        const enabled = this.userConfig?.enabled !== false;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            margin: -20px -20px 20px -20px;
            text-align: center;
        }
        .header h2 {
            margin: 0;
            font-size: 18px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-group textarea {
            resize: vertical;
            height: 80px;
        }
        .form-group small {
            display: block;
            margin-top: 5px;
            color: #666;
            font-size: 12px;
        }
        .form-group input[type="checkbox"] {
            margin-right: 8px;
        }
        .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        .btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5a67d8;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .info-box {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        .info-box p {
            margin: 0;
            color: #1976d2;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Configure User: ${this.userName}</h2>
    </div>

    <div class="info-box">
        <p><strong>User ID:</strong> ${this.userId.substring(0, 30)}...</p>
    </div>

    <form id="userForm">
        <div class="form-group">
            <label for="uuid">UUID *</label>
            <input type="text" 
                   id="uuid" 
                   value="${uuid}" 
                   placeholder="Enter unique identifier for this user"
                   required>
            <small>Unique identifier used for OTP delivery</small>
        </div>

        <div class="form-group">
            <label for="otpSkipDuration">OTP Skip Duration (minutes) *</label>
            <input type="number" 
                   id="otpSkipDuration" 
                   value="${otpSkipDuration}" 
                   min="0" 
                   max="1440"
                   required>
            <small>Time before requiring OTP again (0 = always require)</small>
        </div>

        <div class="form-group">
            <label for="mobileNumbers">Mobile Numbers</label>
            <textarea id="mobileNumbers" 
                      placeholder="+1234567890, +0987654321">${mobileNumbers}</textarea>
            <small>Comma-separated mobile numbers for OTP delivery</small>
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="enabled" ${enabled ? 'checked' : ''}>
                Enable OTP authentication for this user
            </label>
        </div>

        <div class="actions">
            <button type="submit" class="btn btn-primary">Save Configuration</button>
            <button type="button" class="btn btn-secondary" onclick="window.close()">Cancel</button>
        </div>
    </form>

    <script>
        const { ipcRenderer } = require('electron');

        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const uuid = document.getElementById('uuid').value.trim();
            const otpSkipDuration = document.getElementById('otpSkipDuration').value;
            const mobileNumbers = document.getElementById('mobileNumbers').value;
            const enabled = document.getElementById('enabled').checked;

            if (!uuid) {
                alert('Please enter a UUID');
                return;
            }

            try {
                const result = await ipcRenderer.invoke('save-user-config', '${this.userId}', {
                    uuid,
                    otpSkipDuration,
                    mobileNumbers,
                    enabled
                });

                if (result.success) {
                    alert('User configuration saved successfully!');
                    window.close();
                } else {
                    alert('Failed to save: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    </script>
</body>
</html>
        `;
    }

    close() {
        if (this.window) {
            this.window.close();
        }
    }

    destroy() {
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
    }
}

module.exports = UserPanel;