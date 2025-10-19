const crypto = require('crypto');
const forge = require('node-forge');

class CryptoUtils {
    /* static encrypt(text, password) {
        try {
            const algorithm = 'aes-256-gcm';
            const salt = crypto.randomBytes(32);
            const iv = crypto.randomBytes(16);

            // Derive key from password using PBKDF2
            const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

            const cipher = crypto.createCipheriv(algorithm, key, iv);
            // const cipher = crypto.createCipher(algorithm, key);
            // cipher.setAAD(salt);

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            // Combine all components
            const result = {
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                encrypted: encrypted
            };

            return Buffer.from(JSON.stringify(result)).toString('base64');
        } catch (error) {
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    static decrypt(encryptedData, password) {
        try {
            const algorithm = 'aes-256-gcm';

            // Parse encrypted data
            const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
            const salt = Buffer.from(data.salt, 'hex');
            const iv = Buffer.from(data.iv, 'hex');
            const authTag = Buffer.from(data.authTag, 'hex');
            const encrypted = data.encrypted;

            // Derive key from password
            const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

            // const decipher = crypto.createDecipher(algorithm, key);
            // decipher.setAAD(salt);
            // decipher.setAuthTag(authTag);

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    } */

    static encrypt(text, password) {
        try {
            const algorithm = 'aes-256-gcm';
            const salt = crypto.randomBytes(32);
            const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM

            // Derive key
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

            const cipher = crypto.createCipheriv(algorithm, key, iv);

            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            const authTag = cipher.getAuthTag();

            const result = {
                salt: salt.toString('base64'),
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64'),
                encrypted: encrypted
            };

            return Buffer.from(JSON.stringify(result)).toString('base64');
        } catch (err) {
            throw new Error('Encryption failed: ' + err.message);
        }
    }

    static decrypt(encryptedData, password) {
        try {
            const algorithm = 'aes-256-gcm';

            const jsonStr = Buffer.from(encryptedData, 'base64').toString('utf8');
            const data = JSON.parse(jsonStr);

            const salt = Buffer.from(data.salt, 'base64');
            const iv = Buffer.from(data.iv, 'base64');
            const authTag = Buffer.from(data.authTag, 'base64');
            const encrypted = data.encrypted;

            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (err) {
            throw new Error('Decryption failed: ' + err.message);
        }
    }

    static generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    static hashPassword(password) {
        const salt = crypto.randomBytes(32);
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');

        return {
            salt: salt.toString('hex'),
            hash: hash.toString('hex')
        };
    }

    static verifyPassword(password, salt, hash) {
        const saltBuffer = Buffer.from(salt, 'hex');
        const hashBuffer = crypto.pbkdf2Sync(password, saltBuffer, 10000, 64, 'sha512');

        return hashBuffer.toString('hex') === hash;
    }
}

// Export functions
module.exports = {
    encrypt: CryptoUtils.encrypt,
    decrypt: CryptoUtils.decrypt,
    generateSecureKey: CryptoUtils.generateSecureKey,
    hashPassword: CryptoUtils.hashPassword,
    verifyPassword: CryptoUtils.verifyPassword
};