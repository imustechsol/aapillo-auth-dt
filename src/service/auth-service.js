const EventEmitter = require('events');
const log = require('../utils/logger');
const LoginInterceptor = require('./login-interceptor');
const SessionManager = require('./session-manager');
const OTPManager = require('./otp-manager');

class AuthService extends EventEmitter {
    constructor(configManager, userManager) {
        super();
        this.configManager = configManager;
        this.userManager = userManager;
        this.loginInterceptor = null;
        this.sessionManager = null;
        this.otpManager = null;
        this.isRunning = false;
    }

    async start() {
        try {
            log.info('Starting Aapillo Auth Service...');
            
            // Load master configuration
            const masterConfig = this.configManager.getMasterConfig();
            if (!masterConfig) {
                throw new Error('No master configuration found');
            }
            
            // Initialize components
            this.sessionManager = new SessionManager();
            this.otpManager = new OTPManager(masterConfig);
            this.loginInterceptor = new LoginInterceptor(this.userManager, this);
            
            // Start login monitoring
            await this.loginInterceptor.start();
            
            this.isRunning = true;
            log.info('Auth Service started successfully');
            
            this.emit('started');
        } catch (error) {
            log.error('Failed to start Auth Service:', error);
            throw error;
        }
    }

    async stop() {
        try {
            log.info('Stopping Auth Service...');
            
            this.isRunning = false;
            
            if (this.loginInterceptor) {
                await this.loginInterceptor.stop();
            }
            
            log.info('Auth Service stopped');
            this.emit('stopped');
        } catch (error) {
            log.error('Error stopping Auth Service:', error);
            throw error;
        }
    }

    async handleLoginAttempt(userId, username) {
        try {
            log.info(`Login attempt detected for user: ${username} (${userId})`);
            
            // Check if OTP is required for this user
            /* if (!this.userManager.isOTPRequired(userId)) {
                log.info(`OTP not required for user: ${username}`);
                return { requiresOTP: false, allowed: true };
            } */
            
            const userConfig = this.userManager.getUserConfig(userId);
            if (!userConfig || !userConfig.enabled) {
                log.info(`User not configured or disabled: ${username}`);
                return { requiresOTP: false, allowed: true };
            }
            
            // Show OTP window
            this.emit('show-otp', userId, userConfig);
            
            return { requiresOTP: true, allowed: false };
        } catch (error) {
            log.error('Error handling login attempt:', error);
            return { requiresOTP: false, allowed: false };
        }
    }

    async requestOTP(userId) {
        try {
            const userConfig = this.userManager.getUserConfig(userId);
            if (!userConfig) {
                throw new Error('User configuration not found');
            }
            
            const result = await this.otpManager.sendOTP(userConfig.uuid, userConfig.mobileNumbers);
            log.info(`OTP requested for user: ${userId}`);
            
            return result;
        } catch (error) {
            log.error('Failed to request OTP:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyOTP(userId, otp) {
        try {
            const userConfig = this.userManager.getUserConfig(userId);
            if (!userConfig) {
                throw new Error('User configuration not found');
            }
            
            const result = await this.otpManager.verifyOTP(userConfig.uuid, otp);
            
            if (result.success) {
                // Update last OTP time
                this.userManager.updateLastOTPTime(userId);
                
                // Allow login
                this.loginInterceptor.allowLogin(userId);
                
                log.info(`OTP verified successfully for user: ${userId}`);
            }
            
            return result;
        } catch (error) {
            log.error('Failed to verify OTP:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AuthService;