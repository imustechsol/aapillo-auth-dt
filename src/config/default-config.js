const path = require('path');
const os = require('os');

module.exports = {
    app: {
        name: 'Aapillo Auth',
        version: '1.0.0',
        dataPath: path.join(os.homedir(), '.aapillo-auth'),
        configPath: path.join(process.env.PROGRAMDATA, 'AapilloAuth'),
        logPath: path.join(process.env.PROGRAMDATA, 'AapilloAuth', 'logs')
    },

    service: {
        name: 'AapilloAuthService',
        displayName: 'Aapillo Authentication Service',
        description: 'Enterprise authentication service with OTP verification'
    },

    auth: {
        otpLength: 6,
        otpExpiration: 10 * 60 * 1000, // 10 minutes
        maxOtpRetries: 3,
        defaultSkipDuration: 60, // minutes
        sessionCheckInterval: 3000, // 3 seconds
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
        maxSize: '10m',
        datePattern: 'YYYY-MM-DD',
        auditFile: 'audit.log',
        errorFile: 'error.log',
        combinedFile: 'combined.log'
    },

    ui: {
        otpWindow: {
            width: 450,
            height: 350,
            resizable: false,
            alwaysOnTop: true
        },
        configWindow: {
            width: 1000,
            height: 700,
            resizable: true
        }
    },

    system: {
        preventMultipleInstances: true,
        hideFromTaskbar: true,
        runAsService: true,
        autoStart: true
    }
};