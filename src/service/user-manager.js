const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const log = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto-utils');

const util = require('util');
const execAsync = util.promisify(execSync);

class UserManager {
    constructor() {
        this.usersConfigPath = path.join(process.env.PROGRAMDATA, 'AapilloAuth', 'users.enc');
        this.usersConfig = new Map();
    }

    async getSystemUsers() {
        try {
            // Get Windows users using wmic command
            const command = 'wmic useraccount where "LocalAccount=True" get AccountType,Name,SID,Status,Disabled,Description /format:csv';
            const output = execSync(command, { encoding: 'utf8' });

            const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
            const users = [];

            // CHAYAN-DEKSTOP,512,Built-in account for administering the computer/domain,TRUE,Administrator,S-1-5-21-3792357250-27342704-4012658916-500,Degraded
            // 1-AccountType, 2-Description, 3-Disabled, 4-Name, 5-SID, 6-Status
            for (let i = 1; i < lines.length; i++) {                
                const parts = lines[i].split(',');
                log.info(`0 : ${parts[0]}, 1 : ${parts[1]},2 : ${parts[2]},3 : ${parts[3]},4 : ${parts[4]},5 : ${parts[5]},6 : ${parts[6]},7 : ${parts[7]}`);
                if (parts.length >= 4) {
                    const user = {
                        id: parts[5] || 'Not Available',
                        name: parts[4] || 'Unknown',
                        disabled: parts[3] === 'TRUE',
                        lastLogin: '3792357250',
                        description: parts[2] || "A system user account",
                        accounttype: parts[1],
                        status: parts[6],
                    };

                    // Filter out system accounts and disabled users
                    if (user.name &&
                        !user.disabled &&
                        !['Administrator', 'Guest', 'DefaultAccount', 'WDAGUtilityAccount', 'VaultPotectionUser'].includes(user.name)) {
                        users.push(user);
                    }
                }
            }

            log.info(`Found ${users.length} system users`);
            return users;
        } catch (error) {
            log.error('Failed to get system users:', error);
            return [];
        }
    }

    /* async getSystemUsers() {
        try {
            // PowerShell command to get all local users
            const command = `powershell -Command "Get-LocalUser | Select-Object Name,SID,Enabled,LastLogon | ConvertTo-Json"`;

            const { stdout, stderr } = await execAsync(command, { shell: 'powershell.exe', encoding: 'utf8' });

            if (stderr) {
                console.error('PowerShell stderr:', stderr);
            }

            const usersRaw = JSON.parse(stdout);
            const users = [];

            // Handle single object or array (PowerShell ConvertTo-Json returns object if only one user)
            const userList = Array.isArray(usersRaw) ? usersRaw : [usersRaw];

            for (const u of userList) {
                // Filter out disabled users and system accounts
                if (u.Enabled && !['Administrator', 'Guest', 'DefaultAccount', 'WDAGUtilityAccount'].includes(u.Name)) {
                    users.push({
                        id: u.SID,
                        name: u.Name,
                        disabled: !u.Enabled,
                        lastLogin: u.LastLogon || 'Never'
                    });
                }
            }

            console.log(`Found ${users.length} system users`);
            return users;

        } catch (error) {
            console.error('Failed to get system users:', error);
            return [];
        }
    } */

    async loadUsersConfig(masterPassword) {
        try {
            const encryptedData = await fs.readFile(this.usersConfigPath, 'utf8');
            const decryptedData = decrypt(encryptedData, masterPassword);
            const usersData = JSON.parse(decryptedData);

            this.usersConfig = new Map(Object.entries(usersData));
            log.info(`Loaded configuration for ${this.usersConfig.size} users`);
        } catch (error) {
            log.warn('No existing users configuration found or failed to load');
            this.usersConfig = new Map();
        }
    }

    async saveUsersConfig(masterPassword) {
        try {
            const usersData = Object.fromEntries(this.usersConfig);
            const encryptedData = encrypt(JSON.stringify(usersData), masterPassword);

            await fs.writeFile(this.usersConfigPath, encryptedData);
            log.info('Users configuration saved successfully');
        } catch (error) {
            log.error('Failed to save users configuration:', error);
            throw error;
        }
    }

    async saveUserConfig(userId, config) {
        try {
            this.usersConfig.set(userId, {
                uuid: config.uuid,
                otpSkipDuration: parseInt(config.otpSkipDuration) || 60, // minutes
                mobileNumbers: config.mobileNumbers ? config.mobileNumbers.split(',').map(n => n.trim()) : [],
                enabled: config.enabled !== false,
                lastOTPTime: null,
                updatedAt: new Date().toISOString()
            });

            log.info(`User configuration saved for: ${userId}`);
            return { success: true };
        } catch (error) {
            log.error('Failed to save user configuration:', error);
            return { success: false, error: error.message };
        }
    }

    getUserConfig(userId) {
        return this.usersConfig.get(userId) || null;
    }

    isOTPRequired(userId) {
        const userConfig = this.getUserConfig(userId);
        if (!userConfig || !userConfig.enabled) {
            return false;
        }

        if (!userConfig.lastOTPTime) {
            return true;
        }

        const lastOTP = new Date(userConfig.lastOTPTime);
        const now = new Date();
        const minutesSinceLastOTP = (now - lastOTP) / (1000 * 60);

        return minutesSinceLastOTP >= userConfig.otpSkipDuration;
    }

    updateLastOTPTime(userId) {
        const userConfig = this.getUserConfig(userId);
        if (userConfig) {
            userConfig.lastOTPTime = new Date().toISOString();
            this.usersConfig.set(userId, userConfig);
        }
    }

    getAllUsersConfig() {
        return Array.from(this.usersConfig.entries()).map(([userId, config]) => ({
            userId,
            ...config
        }));
    }
}

module.exports = UserManager;