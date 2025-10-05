const axios = require('axios');
const log = require('../utils/logger');

class OTPApi {
    constructor(config) {
        this.baseUrl = config.apiEndpoint;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000;
    }

    async sendOTP(uuid, mobileNumbers) {
        try {
            log.info(`Sending OTP to UUID: ${uuid}`);
            
            const response = await axios.post(`${this.baseUrl}/send-otp`, {
                uuid: uuid,
                mobile_numbers: mobileNumbers,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.data && response.data.success) {
                log.info(`OTP sent successfully for UUID: ${uuid}`);
                return {
                    success: true,
                    data: response.data,
                    otpRef: response.data.otp_ref || response.data.reference
                };
            } else {
                throw new Error(response.data?.message || 'Failed to send OTP');
            }
        } catch (error) {
            log.error('OTP API Error (send):', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async verifyOTP(uuid, otp, otpRef) {
        try {
            log.info(`Verifying OTP for UUID: ${uuid}`);
            
            const response = await axios.post(`${this.baseUrl}/verify-otp`, {
                uuid: uuid,
                otp: otp,
                otp_ref: otpRef,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.data && response.data.success) {
                log.info(`OTP verified successfully for UUID: ${uuid}`);
                return {
                    success: true,
                    data: response.data
                };
            } else {
                throw new Error(response.data?.message || 'Invalid OTP');
            }
        } catch (error) {
            log.error('OTP API Error (verify):', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 5000
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            log.error('API connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = OTPApi;