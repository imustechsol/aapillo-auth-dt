const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const log = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto-utils');
const defaultConfig = require('./default-config');

class ConfigManager {
    constructor() {
        this.configPath = defaultConfig.config.configPath
        this.configFile = path.join(this.configPath, defaultConfig.config.configFile);
        this.masterConfig = null;
        this.encryptionKey = defaultConfig.keys.encryptionKey;
    }

    async isFirstRun() {
        try {
            await fs.access(this.configFile);
            return false;
        } catch {
            return true;
        }
    }

    async configFileExists() {
        try {
            await fs.access(this.configFile);
            return true;
        } catch {
            return false;
        }
    }

    async ensureConfigDir() {
        try {
            await fs.mkdir(this.configPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async saveMasterConfig(config) {
        try {
            await this.ensureConfigDir();

            // Hash master password
            const hashedPassword = await bcrypt.hash(config.masterPassword, 12);

            const configData = {
                masterPasswordHash: hashedPassword,
                apiEndpoint: config.apiEndpoint,
                apiKey: config.apiKey,
                createdAt: new Date().toISOString(),
                version: defaultConfig.app.version
            };

            // Encrypt and save
            const encryptedConfig = encrypt(JSON.stringify(configData), this.encryptionKey);
            await fs.writeFile(this.configFile, encryptedConfig, 'utf8');

            this.masterConfig = configData;

            log.info('Master configuration saved successfully');
            return { success: true };
        } catch (error) {
            log.error('Failed to save master configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async loadMasterConfig(masterPassword) {
        log.info('Config path:', this.configFile);
        log.info('encryptionKey:', this.encryptionKey);
        try {
            await fs.access(this.configFile);
            const encryptedData = await fs.readFile(this.configFile, 'utf8');
            log.info(`enc data: ${encryptedData}`);
            const decryptedData = decrypt(encryptedData, this.encryptionKey);

            const config = JSON.parse(decryptedData);

            // Verify master password
            const isValid = await bcrypt.compare(masterPassword, config.masterPasswordHash);
            if (!isValid) {
                throw new Error('Invalid master password');
            }

            this.masterConfig = config;
            log.info('Master configuration loaded successfully');
            return { success: true, config };
        } catch (error) {
            log.error('Failed to load master configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async getMasterConfig() {
        try {
            const encryptedData = await fs.readFile(this.configFile, 'utf8');
            const decryptedData = decrypt(encryptedData, this.encryptionKey);
            const config = JSON.parse(decryptedData);
            this.masterConfig = config;
            log.info('Master configuration loaded successfully');
            // return { success: true, config };
            return config;
        } catch (error) {
            log.error('Failed to load master configuration:', error);
            return { success: false, error: error.message };
        }
        // return this.masterConfig;
    }

    async exportConfig() {
        try {
            if (!this.masterConfig) {
                throw new Error('No configuration loaded');
            }

            const configData = await fs.readFile(this.configFile, 'utf8');
            const exportData = {
                version: defaultConfig.app.version,
                exportDate: new Date().toISOString(),
                config: configData
            };

            return {
                success: true,
                data: Buffer.from(JSON.stringify(exportData)).toString('base64')
            };
        } catch (error) {
            log.error('Failed to export configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async importConfig(importData) {
        try {
            const decodedData = Buffer.from(importData, 'base64').toString('utf8');
            const configData = JSON.parse(decodedData);

            if (!configData.config || !configData.version) {
                throw new Error('Invalid configuration file format');
            }

            await this.ensureConfigDir();
            await fs.writeFile(this.configFile, configData.config);

            log.info('Configuration imported successfully');
            return { success: true };
        } catch (error) {
            log.error('Failed to import configuration:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = ConfigManager;