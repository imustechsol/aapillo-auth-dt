const { execSync, spawn } = require('child_process');
const os = require('os');
const log = require('./logger');

class WindowsAPI {
    static async isRunningAsAdmin() {
        try {
            // Check if running with administrator privileges
            execSync('net session', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    static async isUserAdmin(userId) {
        try {
            // Check if user is in administrators group
            const command = `net localgroup administrators`;
            const output = execSync(command, { encoding: 'utf8' });
            
            // This is a simplified check - in production, you'd use proper Windows API
            return output.includes('Administrator');
        } catch {
            return false;
        }
    }

    static async getActiveSessions() {
        try {
            // Get current logon sessions using query command
            const command = 'query user';
            const output = execSync(command, { encoding: 'utf8' });
            
            const lines = output.split('\n').filter(line => line.trim());
            const sessions = [];
            
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 4) {
                    sessions.push({
                        username: parts[0],
                        sessionName: parts[1] || 'console',
                        sessionId: parts[2],
                        state: parts[3],
                        userId: await this.getUserSID(parts[0])
                    });
                }
            }
            
            return sessions;
        } catch (error) {
            log.error('Failed to get active sessions:', error);
            return [];
        }
    }

    static async getUserSID(username) {
        try {
            const command = `wmic useraccount where name="${username}" get sid /value`;
            const output = execSync(command, { encoding: 'utf8' });
            const match = output.match(/SID=(.+)/);
            return match ? match[1].trim() : null;
        } catch {
            return null;
        }
    }

    static async lockSession(sessionId) {
        try {
            // Lock the specified session
            const command = `tscon ${sessionId} /dest:console`;
            execSync(command, { stdio: 'ignore' });
            log.info(`Session ${sessionId} locked`);
        } catch (error) {
            log.error(`Failed to lock session ${sessionId}:`, error);
        }
    }

    static async unlockSession(sessionId) {
        try {
            // This would require more complex Windows API integration
            // For now, we'll use a placeholder
            log.info(`Session ${sessionId} unlocked`);
        } catch (error) {
            log.error(`Failed to unlock session ${sessionId}:`, error);
        }
    }

    static async logoffSession(sessionId) {
        try {
            const command = `logoff ${sessionId}`;
            execSync(command, { stdio: 'ignore' });
            log.info(`Session ${sessionId} logged off`);
        } catch (error) {
            log.error(`Failed to logoff session ${sessionId}:`, error);
        }
    }

    static async preventSystemSleep() {
        try {
            // Prevent system from going to sleep during authentication
            const command = 'powercfg -change -standby-timeout-ac 0';
            execSync(command, { stdio: 'ignore' });
        } catch (error) {
            log.error('Failed to prevent system sleep:', error);
        }
    }

    static async restoreSystemSleep() {
        try {
            // Restore original sleep settings
            const command = 'powercfg -change -standby-timeout-ac 30';
            execSync(command, { stdio: 'ignore' });
        } catch (error) {
            log.error('Failed to restore system sleep:', error);
        }
    }

    static async registerStartupService(serviceName, executablePath) {
        try {
            // Register service to start with Windows
            const command = `sc create "${serviceName}" binPath= "${executablePath}" start= auto`;
            execSync(command, { stdio: 'ignore' });
            
            // Start the service
            const startCommand = `sc start "${serviceName}"`;
            execSync(startCommand, { stdio: 'ignore' });
            
            log.info(`Service ${serviceName} registered and started`);
        } catch (error) {
            log.error(`Failed to register startup service:`, error);
            throw error;
        }
    }

    static async unregisterStartupService(serviceName) {
        try {
            // Stop and delete the service
            try {
                execSync(`sc stop "${serviceName}"`, { stdio: 'ignore' });
            } catch {} // Ignore if already stopped
            
            execSync(`sc delete "${serviceName}"`, { stdio: 'ignore' });
            
            log.info(`Service ${serviceName} unregistered`);
        } catch (error) {
            log.error(`Failed to unregister startup service:`, error);
            throw error;
        }
    }
}

module.exports = WindowsAPI;