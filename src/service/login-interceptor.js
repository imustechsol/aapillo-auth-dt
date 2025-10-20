const EventEmitter = require('events');
const { execSync, spawn } = require('child_process');
const log = require('../utils/logger');
const WindowsAPI = require('../utils/windows-api');

class LoginInterceptor extends EventEmitter {
    constructor(userManager, authService) {
        super();
        this.userManager = userManager;
        this.authService = authService;
        this.isMonitoring = false;
        this.monitorProcess = null;
        this.pendingLogins = new Map();
    }

    async start() {
        try {
            log.info('Starting login interceptor...');
            
            // Register Windows login notification
            await this.registerLoginHook();
            
            // Start monitoring logon sessions
            this.startSessionMonitoring();
            
            this.isMonitoring = true;
            log.info('Login interceptor started successfully');
        } catch (error) {
            log.error('Failed to start login interceptor:', error);
            throw error;
        }
    }

    async stop() {
        try {
            log.info('Stopping login interceptor...');
            
            this.isMonitoring = false;
            
            if (this.monitorProcess) {
                this.monitorProcess.kill();
                this.monitorProcess = null;
            }
            
            await this.unregisterLoginHook();
            
            log.info('Login interceptor stopped');
        } catch (error) {
            log.error('Error stopping login interceptor:', error);
        }
    }

    async registerLoginHook() {
        try {
            // This would typically involve Windows API calls or registry modifications
            // For now, we'll use a simpler approach with session monitoring
            log.info('Login hook registered');
        } catch (error) {
            log.error('Failed to register login hook:', error);
            throw error;
        }
    }

    async unregisterLoginHook() {
        try {
            log.info('Login hook unregistered');
        } catch (error) {
            log.error('Failed to unregister login hook:', error);
        }
    }

    startSessionMonitoring() {
        // Monitor Windows events for logon attempts
        const monitorScript = `
        $Action = {
            $Event = $Event.SourceEventArgs.NewEvent
            if ($Event.Id -eq 4624) {  # Successful logon
                $UserSID = $Event.Properties[4].Value
                $UserName = $Event.Properties[5].Value
                $LogonType = $Event.Properties[8].Value
                
                # Only process interactive logons (type 2)
                if ($LogonType -eq 2) {
                    Write-Output "LOGON:$UserSID:$UserName"
                }
            }
        }
        
        Register-WmiEvent -Query "SELECT * FROM Win32_NTLogEvent WHERE LogFile='Security'" -Action $Action
        
        while ($true) {
            Start-Sleep 1
        }
        `;

        // This is a simplified version - in production, you'd use proper Windows API integration
        setInterval(() => {
            this.checkForNewSessions();
        }, 2000);
    }

    async checkForNewSessions() {
        try {
            if (!this.isMonitoring) return;

            // Get current active sessions
            const sessions = await WindowsAPI.getActiveSessions();
            
            for (const session of sessions) {
                if (session.state === 'Active' && !this.pendingLogins.has(session.userId)) {
                    await this.handleNewSession(session);
                }
            }
        } catch (error) {
            log.error('Error checking for new sessions:', error);
        }
    }

    async handleNewSession(session) {
        try {
            const { userId, username } = session;
            
            // Skip administrator accounts
            /* if (await WindowsAPI.isUserAdmin(userId)) {
                log.info(`Skipping admin user: ${username}`);
                return;
            } */
            
            log.info(`New session detected: ${username} (${userId})`);
            
            const result = await this.authService.handleLoginAttempt(userId, username);
            
            if (result.requiresOTP) {
                // Block the session until OTP verification
                this.pendingLogins.set(userId, {
                    username,
                    sessionId: session.sessionId,
                    timestamp: new Date()
                });
                
                // Lock the session
                await WindowsAPI.lockSession(session.sessionId);
            }
            
        } catch (error) {
            log.error('Error handling new session:', error);
        }
    }

    allowLogin(userId) {
        try {
            const pendingLogin = this.pendingLogins.get(userId);
            if (pendingLogin) {
                log.info(`Allowing login for user: ${pendingLogin.username}`);
                
                // Unlock the session
                WindowsAPI.unlockSession(pendingLogin.sessionId);
                
                // Remove from pending logins
                this.pendingLogins.delete(userId);
            }
        } catch (error) {
            log.error('Error allowing login:', error);
        }
    }

    denyLogin(userId) {
        try {
            const pendingLogin = this.pendingLogins.get(userId);
            if (pendingLogin) {
                log.info(`Denying login for user: ${pendingLogin.username}`);
                
                // Logoff the session
                WindowsAPI.logoffSession(pendingLogin.sessionId);
                
                // Remove from pending logins
                this.pendingLogins.delete(userId);
            }
        } catch (error) {
            log.error('Error denying login:', error);
        }
    }
}

module.exports = LoginInterceptor;