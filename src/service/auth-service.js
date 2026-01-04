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

            // Initialize components
            this.sessionManager = new SessionManager();
            this.otpManager = new OTPManager();
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
        const otpRequired = await this.userManager.isOTPRequired(userId);

        log.info('OTP CHECK DEBUG', {
            userId,
            lastOtpVerifiedAt: this.userManager.getUserConfig(userId)?.lastOtpVerifiedAt,
            otpSkipDuration: this.userManager.getUserConfig(userId)?.otpSkipDuration,
            now: Date.now(),
            isOtpRequired: otpRequired
        });

        try {
            log.info(`Login attempt detected for user: ${username} (${userId})`);

            const userConfig = this.userManager.getUserConfig(userId);

            //No config → deny login
            if (!userConfig) {
                log.info(`Login denied: no config for user ${username}`);
                return { requiresOTP: false, allowed: false };
            }

            //Config exists but disabled → deny login
            if (!userConfig.enabled) {
                log.info(`Login denied: user disabled ${username}`);
                return { requiresOTP: false, allowed: false };
            }

            //OTP not required (skip window valid)            
            if (!otpRequired) {
                log.info(`OTP skipped for user: ${username}`);

                const session = this.sessionManager.getSessionByUserId(userId);
                if (session) {
                    this.sessionManager.setSessionAuthenticated(session.sessionId, true);
                }

                return { requiresOTP: false, allowed: true };
            } else {
                //OTP required
                this.emit('show-otp', userId, userConfig);

                return { requiresOTP: true, allowed: false };
            }
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

            // Load master configuration
            const masterConfig = await this.configManager.getMasterConfig();
            if (!masterConfig) {
                throw new Error('No master configuration found');
            }

            const result = await this.otpManager.sendOTP(userConfig.uuid, userConfig.mobileNumbers, masterConfig);
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
                log.info(`OTP verified successfully for user: ${userId}`);

                // Update last OTP time
                await this.userManager.updateLastOTPTime(userId);

                // Allow login
                this.loginInterceptor.allowLogin(userId);

                const session = this.sessionManager.getSessionByUserId(userId);
                if (session) {
                    this.sessionManager.setSessionAuthenticated(session.sessionId, true);
                }
            }

            return result;
        } catch (error) {
            log.error('Failed to verify OTP:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AuthService;