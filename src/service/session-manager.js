const EventEmitter = require('events');
const log = require('../utils/logger');
const WindowsAPI = require('../utils/windows-api');
const defaultConfig = require('../config/default-config');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.activeSessions = new Map();
        this.monitoringInterval = null;
        this.isMonitoring = false;
    }

    async start() {
        try {
            if (this.isMonitoring) return;
            log.info('Starting session monitoring...');
            
            this.isMonitoring = true;
            
            // Initial session scan
            await this.scanSessions();
            
            // Start periodic monitoring
            this.monitoringInterval = setInterval(() => {
                this.scanSessions();
            }, defaultConfig.auth.sessionCheckInterval); // Check every 10 seconds
            
            log.info('Session monitoring started');
        } catch (error) {
            log.error('Failed to start session monitoring:', error);
            throw error;
        }
    }

    async stop() {
        try {
            log.info('Stopping session monitoring...');
            
            this.isMonitoring = false;
            
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            
            this.activeSessions.clear();
            
            log.info('Session monitoring stopped');
        } catch (error) {
            log.error('Error stopping session monitoring:', error);
        }
    }

    async scanSessions() {
        try {
            if (!this.isMonitoring) return;

            const currentSessions = await WindowsAPI.getActiveSessions();
            const currentSessionIds = new Set();

            log.debug(JSON.stringify(currentSessions, null, 2));
            
            // Process current sessions
            for (const session of currentSessions) {
                currentSessionIds.add(session.sessionId);
                
                const existingSession = this.activeSessions.get(session.sessionId);
                
                if (!existingSession) {
                    // New session detected
                    this.activeSessions.set(session.sessionId, {
                        ...session,
                        startTime: new Date(),
                        lastSeen: new Date(),
                        authenticated: false
                    });
                    
                    this.emit('session-started', session);
                    log.info(`New session detected: ${session.username} (${session.sessionId})`);
                } else {
                    // Update existing session
                    existingSession.lastSeen = new Date();
                    existingSession.state = session.state;
                }
            }

            // Check for ended sessions
            for (const [sessionId, session] of this.activeSessions) {
                if (!currentSessionIds.has(sessionId)) {
                    this.activeSessions.delete(sessionId);
                    this.emit('session-ended', session);
                    log.info(`Session ended: ${session.username} (${sessionId})`);
                }
            }

        } catch (error) {
            log.error('Error scanning sessions:', error);
        }
    }

    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    getAllSessions() {
        return Array.from(this.activeSessions.values());
    }

    setSessionAuthenticated(sessionId, authenticated = true) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.authenticated = authenticated;
            session.authTime = authenticated ? new Date() : null;
            
            this.emit('session-auth-changed', session);
            log.info(`Session authentication updated: ${session.username} (${sessionId}) - ${authenticated ? 'authenticated' : 'not authenticated'}`);
        }
    }

    getUnauthenticatedSessions() {
        return Array.from(this.activeSessions.values()).filter(session => !session.authenticated);
    }

    getSessionByUserId(userId) {
        return Array.from(this.activeSessions.values()).find(session => session.userId === userId);
    }
}

module.exports = SessionManager;