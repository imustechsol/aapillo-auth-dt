const { BrowserWindow, screen } = require('electron');
const path = require('path');
const os = require('os');
const { encrypt } = require('../utils/crypto-utils');

const primaryDisplay = screen.getPrimaryDisplay();
const { width, height } = primaryDisplay.workAreaSize;

module.exports = {
    app: {
        name: 'Aapillo Auth',
        version: '1.0.0'
    },

    service: {
        name: 'AapilloAuthService',
        displayName: 'Aapillo Authentication Service',
        description: 'Enterprise authentication service with OTP verification'
    },

    auth: {
        otpLength: 6,
        otpExpiration: 3 * 60 * 1000, // 10 minutes
        maxOtpRetries: 3,
        defaultSkipDuration: 60, // minutes
        sessionCheckInterval: 10000, // 3 seconds
        cleanupInterval: 5 * 60 * 1000 // 5 minutes
    },

    api: {
        timeout: 30000, // 30 seconds
        retries: 3,
        retryDelay: 1000 // 1 second
    },

    security: {
        encryptionAlgorithm: 'aes-256-gcm',
        keyDerivationIterations: 10000,
        saltLength: 32,
        ivLength: 16
    },

    logging: {
        level: 'info',
        maxFiles: 10,
        maxSize: 10 * 1024 * 1024,
        datePattern: 'YYYY-MM-DD',
        auditFile: 'audit.log',
        errorFile: 'error.log',
        combinedFile: 'combined.log'
    },

    ui: {
        otpWindow: {
            width: width,
            height: height,
            resizable: false,
            alwaysOnTop: true
        },
        configWindow: {
            width: 1024,
            height: 768,
            title: 'Aapillo Auth - Configuration',
        }
    },

    system: {
        preventMultipleInstances: true,
        hideFromTaskbar: true,
        runAsService: true,
        autoStart: true
    },

    keys: {
        encryptionKey: "1234567890"
    },

    config: {
        dataPath: path.join(os.homedir(), '.aapillo-auth'),
        configPath: path.join(process.env.PROGRAMDATA, 'AapilloAuth'),
        logPath: path.join(process.env.PROGRAMDATA, 'AapilloAuth', 'logs'),
        configFile: 'config.enc',
        usersConfigFile: 'users.enc',
        eximExtension: 'acdf',
        eximConfigFile: 'aappillo_config.acdf',
        eximConfigName: 'Aappillo Config',
        exportTitle: 'Export Configuration',
        importTitle: 'Import Configuration'
    }
};