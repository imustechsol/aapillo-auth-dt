const winston = require('winston');
const path = require('path');
const fs = require('fs');
const defaultConfig = require('../config/default-config');

const logPath = defaultConfig.config.logPath;

if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
}

const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

const logger = winston.createLogger({
    level: defaultConfig.logging.level || 'info',
    format: customFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(logPath, defaultConfig.logging.errorFile),
            level: 'error',
            maxsize: defaultConfig.logging.maxSize,
            maxFiles: defaultConfig.logging.maxFiles,
            tailable: true
        }),
        new winston.transports.File({
            filename: path.join(logPath, defaultConfig.logging.combinedFile),
            maxsize: defaultConfig.logging.maxSize,
            maxFiles: defaultConfig.logging.maxFiles,
            tailable: true
        }),
        new winston.transports.File({
            filename: path.join(logPath, defaultConfig.logging.auditFile),
            level: 'info',
            maxsize: defaultConfig.logging.maxSize,
            maxFiles: defaultConfig.logging.maxFiles,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
    exitOnError: false
});

logger.audit = (message, metadata = {}) => {
    logger.info(`[AUDIT] ${message}`, {
        ...metadata,
        auditLog: true,
        timestamp: new Date().toISOString()
    });
};

logger.security = (message, metadata = {}) => {
    logger.warn(`[SECURITY] ${message}`, {
        ...metadata,
        securityLog: true,
        timestamp: new Date().toISOString()
    });
};

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = logger;