const crypto = require('crypto');
const log = require('../utils/logger');

class Encryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.saltLength = 32;
        this.tagLength = 16;
        this.iterations = 100000;
    }

    deriveKey(password, salt) {
        return crypto.pbkdf2Sync(
            password,
            salt,
            this.iterations,
            this.keyLength,
            'sha512'
        );
    }

    encrypt(plainText, password) {
        try {
            const salt = crypto.randomBytes(this.saltLength);
            const key = this.deriveKey(password, salt);
            const iv = crypto.randomBytes(this.ivLength);
            
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            let encrypted = cipher.update(plainText, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            const result = {
                version: '1.0',
                algorithm: this.algorithm,
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                data: encrypted
            };
            
            return Buffer.from(JSON.stringify(result)).toString('base64');
        } catch (error) {
            log.error('Encryption error:', error);
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    decrypt(encryptedData, password) {
        try {
            const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            
            const salt = Buffer.from(parsed.salt, 'hex');
            const iv = Buffer.from(parsed.iv, 'hex');
            const authTag = Buffer.from(parsed.authTag, 'hex');
            const encrypted = parsed.data;
            
            const key = this.deriveKey(password, salt);
            
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            log.error('Decryption error:', error);
            throw new Error('Decryption failed. Invalid password or corrupted data.');
        }
    }

    encryptObject(obj, password) {
        const jsonStr = JSON.stringify(obj);
        return this.encrypt(jsonStr, password);
    }

    decryptObject(encryptedData, password) {
        const jsonStr = this.decrypt(encryptedData, password);
        return JSON.parse(jsonStr);
    }
}

module.exports = new Encryption();