const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const log = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto-utils');

class ConfigManager {
    constructor() {
        this.configPath = path.join(process.env.PROGRAMDATA, 'AapilloAuth');
        this.configFile = path.join(this.configPath, 'config.enc');
        this.masterConfig = null;
    }

    async isFirstRun() {
        try {
            await fs.access(this.configFile);
            return false;
        } catch {
            return true;
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
                version: '1.0.0'
            };

            // Encrypt and save
            const encryptedConfig = encrypt(JSON.stringify(configData), config.masterPassword);
            await fs.writeFile(this.configFile, encryptedConfig);
            
            this.masterConfig = configData;
            
            log.info('Master configuration saved successfully');
            return { success: true };
        } catch (error) {
            log.error('Failed to save master configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async loadMasterConfig(masterPassword) {
        const encryptedData = await fs.readFile(this.configFile, 'utf8');
        log.info(`enc data: ${encryptedData}`);
        /* try {
            const encryptedData = await fs.readFile(this.configFile, 'utf8');
            const decryptedData = decrypt(encryptedData, masterPassword);
            
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
        } */
    }

    async exportConfig() {
        try {
            if (!this.masterConfig) {
                throw new Error('No configuration loaded');
            }
            
            const configData = await fs.readFile(this.configFile, 'utf8');
            const exportData = {
                version: '1.0.0',
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

    getMasterConfig() {
        return this.masterConfig;
    }
}

module.exports = ConfigManager;