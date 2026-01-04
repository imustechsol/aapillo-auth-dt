const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const log = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto-utils');
const defaultConfig = require('../config/default-config');

class UserManager {
    constructor() {
        this.encryptionKey = defaultConfig.keys.encryptionKey;
        this.configPath = defaultConfig.config.configPath;
        this.usersConfigPath = path.join(this.configPath, defaultConfig.config.usersConfigFile);
        this.usersConfig = new Map();
    }

    async ensureConfigDir() {
        await fs.mkdir(this.configPath, { recursive: true });
    }

    async getSystemUsers() {
        try {
            const command = 'wmic useraccount where "LocalAccount=True" get AccountType,Name,SID,Status,Disabled,Description /format:csv';
            const output = execSync(command, { encoding: 'utf8' });

            const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('Node'));
            const users = [];

            for (let i = 1; i < lines.length; i++) {
                const p = lines[i].split(',');

                const user = {
                    id: p[5], // SID (single source of truth)
                    name: p[4],
                    disabled: p[3] === 'TRUE',
                    description: p[2] || '',
                    accountType: p[1],
                    status: p[6]
                };

                if (
                    user.id &&
                    user.name &&
                    !user.disabled &&
                    !['Administrator', 'Guest', 'DefaultAccount', 'WDAGUtilityAccount'].includes(user.name)
                ) {
                    users.push(user);
                }
            }

            return users;
        } catch (err) {
            log.error('Failed to read system users', err);
            return [];
        }
    }

    async loadUsersConfig() {
        try {
            await this.ensureConfigDir();

            const encrypted = await fs.readFile(this.usersConfigPath, 'utf8');
            const decrypted = decrypt(encrypted, this.encryptionKey);
            const parsed = JSON.parse(decrypted);

            this.usersConfig = new Map(Object.entries(parsed));
            log.info(`Loaded ${this.usersConfig.size} user configurations`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                log.info('users.enc not found — starting fresh');
            } else {
                log.error('Failed to load users.enc (corrupted?)', err);
            }
            this.usersConfig = new Map();
        }
    }

    async persist() {
        await this.ensureConfigDir();
        const data = Object.fromEntries(this.usersConfig);
        const encrypted = encrypt(JSON.stringify(data, null, 2), this.encryptionKey);
        await fs.writeFile(this.usersConfigPath, encrypted, 'utf8');
    }

    async saveUserConfig(userId, config) {
        this.usersConfig.set(userId, {
            uuid: config.uuid,
            otpSkipDuration: Number(config.otpSkipDuration) || defaultConfig.auth.defaultSkipDuration,
            mobileNumbers: Array.isArray(config.mobileNumbers)
                ? config.mobileNumbers
                : (config.mobileNumbers || '').split(',').map(n => n.trim()).filter(Boolean),
            enabled: config.enabled !== false,
            lastOTPTime: null,
            updatedAt: new Date().toISOString()
        });

        await this.persist();
        return { success: true };
    }

    getUserConfig(userId) {
        return this.usersConfig.get(userId) || null;
    }

    /* isOTPRequired(userId) {
        const cfg = this.getUserConfig(userId);
        if (!cfg || !cfg.enabled) return false;

        if (!cfg.lastOTPTime) return true;

        const diffMin = (Date.now() - new Date(cfg.lastOTPTime)) / 60000;
        return diffMin >= cfg.otpSkipDuration;
    } */

    async isOTPRequired(userId) {
        const user = await this.getUserConfig(userId);

        if (!user || !user.enabled) return false;
        if (!user.lastOTPTime) return true;

        const skipMs = (user.otpSkipDuration || defaultConfig.auth.defaultSkipDuration) * 60 * 1000;
        return Date.now() > new Date(user.lastOTPTime).getTime() + skipMs;
    }

    async updateLastOTPTime(userId) {
        const cfg = this.getUserConfig(userId);
        if (!cfg) return;

        cfg.lastOTPTime = new Date().toISOString();
        cfg.updatedAt = cfg.lastOTPTime;
        this.usersConfig.set(userId, cfg);

        await this.persist();
    }

    /* getAllUsersConfig() {
        return Array.from(this.usersConfig.entries()).map(([userId, cfg]) => ({
            userId,
            ...cfg
        }));
    } */
}

module.exports = UserManager;
