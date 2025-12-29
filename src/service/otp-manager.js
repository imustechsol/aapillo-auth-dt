const axios = require('axios');
const log = require('../utils/logger');

class OTPManager {
    constructor() {
        // this.apiEndpoint = masterConfig.apiEndpoint;
        // this.apiKey = masterConfig.apiKey;
        this.pendingOTPs = new Map();
    }

    async sendOTP(uuid, mobileNumbers, config) {
        try {
            log.info(`Sending OTP for UUID: ${uuid}, Numbers: ${mobileNumbers}`);
            log.info(`API endpoint at otp manager: ${apiEndpoint}`);

            const response = await axios.post(`${config.apiEndpoint}/send-otp`, {
                uuid: uuid,
                secret: config.apiKey,
                mobile_numbers: mobileNumbers,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    // 'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.success) {
                // Store OTP reference for verification
                this.pendingOTPs.set(uuid, {
                    otpRef: response.data.otp_ref,
                    timestamp: new Date(),
                    mobileNumbers: mobileNumbers
                });

                log.info(`OTP sent successfully for UUID: ${uuid}`);
                return {
                    success: true,
                    message: 'OTP sent successfully',
                    otpRef: response.data.otp_ref
                };
            } else {
                throw new Error(response.data.message || 'Failed to send OTP');
            }
        } catch (error) {
            log.error('Failed to send OTP:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async verifyOTP(uuid, otp) {
        try {
            const pendingOTP = this.pendingOTPs.get(uuid);
            if (!pendingOTP) {
                throw new Error('No OTP request found for this user');
            }

            log.info(`Verifying OTP for UUID: ${uuid}`);

            const response = await axios.post(`${this.apiEndpoint}/verify-otp`, {
                uuid: uuid,
                otp: otp,
                otp_ref: pendingOTP.otpRef,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.success) {
                // Remove pending OTP
                this.pendingOTPs.delete(uuid);

                log.info(`OTP verified successfully for UUID: ${uuid}`);
                return {
                    success: true,
                    message: 'OTP verified successfully'
                };
            } else {
                throw new Error(response.data.message || 'Invalid OTP');
            }
        } catch (error) {
            log.error('Failed to verify OTP:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    cleanupExpiredOTPs() {
        const now = new Date();
        const expiredTime = 10 * 60 * 1000; // 10 minutes

        for (const [uuid, otpData] of this.pendingOTPs) {
            if (now - otpData.timestamp > expiredTime) {
                this.pendingOTPs.delete(uuid);
                log.info(`Expired OTP cleaned up for UUID: ${uuid}`);
            }
        }
    }
}

module.exports = OTPManager;