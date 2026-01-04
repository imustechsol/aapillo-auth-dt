const { execSync, spawn } = require('child_process');
const log = require('./logger');

class WindowsAPI {
    
    static isUserAdmin() {
        try {
            // Administrators group SID (language independent)
            const ADMIN_SID = 'S-1-5-32-544';

            const output = execSync('whoami /groups', {
                encoding: 'utf8'
            });

            return output.includes(ADMIN_SID);
        } catch (err) {
            return false;
        }
    }

    /* static async getActiveSessions() {
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
    } */

    static async getActiveSessions() {
        try {
            let output = '';
            try {
                // Use shell: true so it runs properly on Windows
                output = execSync('query user', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            } catch (e) {
                // even if it fails, get what we can from stdout
                output = e.stdout?.toString() || '';
            }

            if (!output.trim()) {
                log.warn('No active sessions found or command returned empty output');
                return [];
            }

            const lines = output.split('\n').filter(line => line.trim());
            const sessions = [];

            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 4) {
                    sessions.push({
                        username: parts[0].replace(/^>/, ''), // remove leading >
                        sessionName: parts[1] || 'console',
                        sessionId: parts[2],
                        state: parts[3],
                        userId: await this.getUserSID(parts[0].replace(/^>/, ''))
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
            } catch { } // Ignore if already stopped

            execSync(`sc delete "${serviceName}"`, { stdio: 'ignore' });

            log.info(`Service ${serviceName} unregistered`);
        } catch (error) {
            log.error(`Failed to unregister startup service:`, error);
            throw error;
        }
    }

    static async createStartupTask() {
        return new Promise((resolve, reject) => {
            const exePath = process.execPath;

            const taskCmd = `schtasks /create /sc onlogon /rl highest /f ^
                            /tn "AapilloAuth" ^
                            /tr "\\"${exePath}\\""`.trim();

            execSync(taskCmd, { windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                } else {
                    resolve(true);
                }
            });
        });
    }

    static async startupTaskExists() {
        return new Promise((resolve) => {
            execSync('schtasks /query /tn "AapilloAuth"', (err) => {
                resolve(!err);
            });
        });
    }
}

module.exports = WindowsAPI;