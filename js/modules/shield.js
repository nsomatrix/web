import { formatTimestamp, getBrowserInfo, getDeviceInfo, showConfirmModal } from './utils.js';
import { TOTPManager } from './totp.js';

export class ShieldManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.isLoading = false;
        this.currentSessionId = this.generateSessionId();
    }

    generateSessionId() {
        let sessionId = sessionStorage.getItem('nsomatrix_session_id');
        
        // Always generate a unique session ID for each browser tab/window
        if (!sessionId) {
            // Create truly unique session ID with timestamp and random component
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            sessionId = `session_${timestamp}_${random}`;
            sessionStorage.setItem('nsomatrix_session_id', sessionId);
        }
        return sessionId;
    }

    generateBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.platform,
            canvas.toDataURL()
        ].join('|');
        
        // Create hash of fingerprint
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Session Management
    async createSession() {
        if (!this.authManager.currentUser) return;
        
        try {
            // Ensure we have a session ID
            if (!this.currentSessionId) {
                this.currentSessionId = this.generateSessionId();
            }
            
            await this.cleanupOldSessions();
            
            const fingerprint = this.generateBrowserFingerprint();
            const ip = await this.getClientIP();
            
            // Check if this exact session already exists
            const existingSession = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').doc(this.currentSessionId).get();
            
            if (existingSession.exists && existingSession.data().isActive) {
                // Session already exists and is active, just update activity
                await existingSession.ref.update({
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                    userAgent: navigator.userAgent,
                    browser: getBrowserInfo(),
                    device: getDeviceInfo(),
                    ip: ip
                });

                return;
            }

            // Create new session with unique ID
            const sessionData = {
                sessionId: this.currentSessionId, // Store session ID in document for reference
                fingerprint: fingerprint,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                browser: getBrowserInfo(),
                device: getDeviceInfo(),
                ip: ip,
                isActive: true
            };

            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').doc(this.currentSessionId).set(sessionData);
            

        } catch (error) {
            console.log('Session creation failed:', error.message);
        }
    }

    async cleanupOldSessions() {
        if (!this.authManager.currentUser) return;
        
        try {
            // Clean up sessions older than 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const oldSessions = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions')
                .where('lastActivity', '<', oneDayAgo)
                .get();
            
            const batch = this.db.batch();
            oldSessions.docs.forEach(doc => batch.delete(doc.ref));
            if (!oldSessions.empty) await batch.commit();
        } catch (error) {
            console.log('Session cleanup failed:', error.message);
        }
    }

    async getSessions() {
        if (!this.authManager.currentUser) return [];
        
        try {
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions')
                .where('isActive', '==', true)
                .get();
            
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.log('Failed to get sessions:', error.message);
            return [];
        }
    }

    async revokeSession(sessionId) {
        if (!this.authManager.currentUser) return;
        
        await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('sessions').doc(sessionId).update({ isActive: false });
    }

    async revokeAllSessions() {
        if (!this.authManager.currentUser) return;
        
        try {
            const sessions = await this.getSessions();
            const batch = this.db.batch();
            
            let revokedCount = 0;
            sessions.forEach(session => {
                if (session.id !== this.currentSessionId) {
                    const ref = this.db.collection('players').doc(this.authManager.currentUser.uid)
                        .collection('sessions').doc(session.id);
                    batch.delete(ref);
                    revokedCount++;
                }
            });
            
            if (revokedCount > 0) {
                await batch.commit();
            }
        } catch (error) {
            console.error('Error revoking all sessions:', error);
            throw error;
        }
    }

    // Industry Standard Login History
    async recordLogin(success = true, failureReason = null) {
        if (!this.authManager.currentUser && success) return;
        
        try {
            const ip = await this.getClientIP();
            const location = await this.getLocation();
            const fingerprint = this.generateBrowserFingerprint();
            
            const loginData = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: ip,
                location: location,
                userAgent: navigator.userAgent,
                browser: getBrowserInfo(),
                device: getDeviceInfo(),
                fingerprint: fingerprint,
                success: success,
                failureReason: failureReason,
                sessionId: success ? this.currentSessionId : null
            };

            if (success && this.authManager.currentUser) {
                await this.db.collection('players').doc(this.authManager.currentUser.uid)
                    .collection('loginHistory').add(loginData);
            } else {
                // For failed logins, store in global collection for security monitoring
                await this.db.collection('failedLogins').add({
                    ...loginData,
                    attemptedEmail: failureReason?.email || 'unknown'
                });
            }
            
            // Cleanup old entries (keep last 50)
            await this.cleanupLoginHistory();
        } catch (error) {
            console.log('Login recording failed:', error.message);
        }
    }

    async cleanupLoginHistory() {
        if (!this.authManager.currentUser) return;
        
        try {
            // Get all login history entries
            const allSnapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory')
                .orderBy('timestamp', 'desc')
                .get();
            
            // If we have more than 50 entries, delete the oldest ones
            if (allSnapshot.size > 50) {
                const batch = this.db.batch();
                const docsToDelete = allSnapshot.docs.slice(50); // Keep first 50, delete the rest
                
                docsToDelete.forEach(doc => batch.delete(doc.ref));
                if (docsToDelete.length > 0) {
                    await batch.commit();
                }
            }
        } catch (error) {
            console.log('Login history cleanup failed:', error.message);
        }
    }

    async getLoginHistory() {
        if (!this.authManager.currentUser) return [];
        
        try {
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.log('Failed to get login history:', error.message);
            return [];
        }
    }

    // Security Score Calculation
    async calculateSecurityScore() {
        if (!this.authManager.currentUser) return 0;
        
        let score = 0;
        const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
        const data = playerDoc.data();

        // Master password set (30 points)
        if (data.hasMasterPassword) score += 30;
        
        // Recovery key exists (25 points)
        if (data.encryptedMasterKey) score += 25;
        
        // Recent login activity (15 points)
        const loginHistory = await this.getLoginHistory();
        if (loginHistory.length > 0) {
            const lastLogin = loginHistory[0];
            if (lastLogin.timestamp && lastLogin.timestamp.toMillis) {
                const daysSinceLogin = (Date.now() - lastLogin.timestamp.toMillis()) / (1000 * 60 * 60 * 24);
                if (daysSinceLogin < 7) score += 15;
            }
        }

        // Active sessions management (10 points)
        const sessions = await this.getSessions();
        if (sessions.length <= 3) score += 10;

        // Email verification (5 points)
        if (this.authManager.currentUser.emailVerified) score += 5;

        // Two-factor authentication (10 points) - either authenticator OR email 2FA
        if (data.authenticatorEnabled || data.emailTwoFactorEnabled) score += 10;

        // Account age (5 points)
        const accountAge = (Date.now() - this.authManager.currentUser.metadata.creationTime) / (1000 * 60 * 60 * 24);
        if (accountAge > 30) score += 5;

        return Math.min(score, 100);
    }



    // Recovery Key Management
    async regenerateRecoveryKey() {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            throw new Error('Master password required');
        }

        const newRecoveryKey = this.generateRecoveryKey();
        const encryptedMasterKey = this.encryptWithRecoveryKey(
            this.authManager.currentEncryptionKey.toString(CryptoJS.enc.Hex), 
            newRecoveryKey
        );

        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            encryptedMasterKey: encryptedMasterKey
        });

        await this.logSecurityEvent('recovery_key_regenerated');
        return newRecoveryKey;
    }

    generateRecoveryKey() {
        return CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Base64).replace(/[+/=]/g, '').substring(0, 32);
    }

    encryptWithRecoveryKey(data, recoveryKey) {
        const key = CryptoJS.SHA256(recoveryKey);
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
        return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
    }

    // Security Events Logging
    async logSecurityEvent(eventType, details = {}) {
        if (!this.authManager.currentUser) return;
        
        const eventData = {
            type: eventType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: await this.getClientIP(),
            userAgent: navigator.userAgent,
            details: details
        };

        await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('securityEvents').add(eventData);
    }

    async getSecurityEvents() {
        if (!this.authManager.currentUser) return [];
        
        const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('securityEvents').orderBy('timestamp', 'desc').limit(20).get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }









    // Device Detection
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Utility functions still needed locally
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'Unknown';
        }
    }

    async getLocation() {
        try {
            const ip = await this.getClientIP();
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            return `${data.city}, ${data.country_name}`;
        } catch {
            return 'Unknown';
        }
    }

    formatEventType(type) {
        const types = {
            'recovery_key_regenerated': 'Recovery Key Regenerated',
            'data_exported': 'Data Exported',
            'fingerprint_enabled': 'Fingerprint Authentication Enabled',
            'fingerprint_disabled': 'Fingerprint Authentication Disabled',
            'authenticator_enabled': 'App Authenticator Enabled',
            'authenticator_disabled': 'App Authenticator Disabled',
            'email_2fa_enabled': 'Email Two-Factor Authentication Enabled',
            'email_2fa_disabled': 'Email Two-Factor Authentication Disabled'
        };
        return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }



    // Real TOTP Authenticator
    async setupAuthenticator() {
        const secret = TOTPManager.generateSecret();
        const qrCodeUrl = TOTPManager.generateQRCodeURL(secret, 'NSO Matrix', this.authManager.currentUser.email);
        
        return new Promise((resolve, reject) => {
            this.showAuthenticatorModal(qrCodeUrl, secret, resolve, reject);
        });
    }

    showAuthenticatorModal(qrCodeUrl, secret, resolve, reject) {
        // Remove any existing modals first
        const existingModals = document.querySelectorAll('div[style*="z-index:10001"]');
        existingModals.forEach(modal => modal.remove());
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#e74c3c;margin-bottom:20px;">📱 Setup Authenticator App</h3>
                <p>1. Install Google Authenticator or Authy</p>
                <p>2. Scan this QR code:</p>
                <img src="${qrCodeUrl}" style="margin:20px 0;border:1px solid #333;" onerror="this.style.display='none';document.getElementById('qrError').style.display='block';" />
                <div id="qrError" style="display:none;color:#ff6b6b;margin:20px 0;">QR code failed to load. Use manual entry below.</div>
                <p style="font-size:12px;color:#888;margin-bottom:20px;">Or enter manually: <br><code style="background:#2d2d2d;padding:5px;word-break:break-all;">${secret}</code></p>
                <input type="text" id="totpVerifyCode" placeholder="Enter 6-digit code" style="background:#2d2d2d;color:white;border:1px solid #555;padding:10px;margin:10px 0;width:150px;text-align:center;" maxlength="6" pattern="[0-9]{6}" />
                <div id="verificationError" style="color:#ff6b6b;margin:10px 0;display:none;"></div>
                <div>
                    <button id="verifyTOTPBtn" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">Verify & Enable</button>
                    <button id="cancelTOTPBtn" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const verifyBtn = document.getElementById('verifyTOTPBtn');
        const codeInput = document.getElementById('totpVerifyCode');
        const errorDiv = document.getElementById('verificationError');
        
        // Allow Enter key to verify
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                verifyBtn.click();
            }
        });
        
        verifyBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const code = codeInput.value.trim();
            
            // Clear previous errors
            errorDiv.style.display = 'none';
            
            if (!/^\d{6}$/.test(code)) {
                errorDiv.textContent = 'Please enter a valid 6-digit code';
                errorDiv.style.display = 'block';
                return;
            }
            
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';
            
            try {
                const isValid = await TOTPManager.verifyTOTP(secret, code);
                if (isValid) {
                    await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                        authenticatorEnabled: true,
                        totpSecret: secret,
                        emailTwoFactorEnabled: true  // Auto-enable email 2FA as fallback
                    });
                    await this.logSecurityEvent('authenticator_enabled');
                    await this.logSecurityEvent('email_2fa_enabled', { reason: 'auto_fallback' });
                    modal.remove();
                    resolve();
                } else {
                    errorDiv.textContent = 'Invalid code. Please check your authenticator app and try again.';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('TOTP verification error:', error);
                errorDiv.textContent = 'Verification failed. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify & Enable';
            }
        };
        
        document.getElementById('cancelTOTPBtn').onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.remove();
            reject(new Error('Setup cancelled'));
        };
    }









    // UI Management Methods
    async loadShieldData() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            await this.cleanupDuplicateSessions();
            await this.loadSecurityScore();
            await this.loadSessionsData();
            await this.loadHistoryData();
            await this.loadSecurityEvents();
            await this.loadBiometricStatus();
            this.setupShieldTabs();
            this.setupModalHandlers();
            this.setupRealtimeListeners();
        } finally {
            this.isLoading = false;
        }
    }

    setupRealtimeListeners() {
        if (!this.authManager.currentUser) return;
        
        // Real-time session updates
        this.sessionListener = this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('sessions').where('isActive', '==', true)
            .onSnapshot(() => {
                this.loadSessionsData();
            });
        
        // Real-time user data updates (for authenticator status)
        this.userListener = this.db.collection('players').doc(this.authManager.currentUser.uid)
            .onSnapshot(() => {
                this.loadBiometricStatus();
                this.loadSecurityScore();
            });
    }

    cleanup() {
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        if (this.userListener) {
            this.userListener();
            this.userListener = null;
        }
    }
    
    setupModalHandlers() {
        // Add body scroll lock when shield modal opens
        const shieldModal = document.getElementById('shieldModal');
        if (shieldModal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const isVisible = shieldModal.style.display !== 'none';
                        if (isVisible) {
                            document.body.classList.add('modal-open');
                        } else {
                            document.body.classList.remove('modal-open');
                        }
                    }
                });
            });
            observer.observe(shieldModal, { attributes: true });
        }
        
        // Handle close button
        const closeButton = document.querySelector('[data-modal="shieldModal"]');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.body.classList.remove('modal-open');
            });
        }
    }

    setupShieldTabs() {
        // Setup authenticator buttons
        document.getElementById('setupAuthenticator')?.addEventListener('click', () => this.setupAuthenticatorUI());
        document.getElementById('disableAuthenticator')?.addEventListener('click', () => this.disableAuthenticatorUI());
        
        // Setup email 2FA buttons
        document.getElementById('enableEmailTwoFactor')?.addEventListener('click', () => this.enableEmailTwoFactorUI());
        document.getElementById('disableEmailTwoFactor')?.addEventListener('click', () => this.disableEmailTwoFactorUI());
    }

    async enableEmailTwoFactorUI() {
        if (await this.showInlineConfirm('Enable email-based two-factor authentication? You will receive codes via email.')) {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                emailTwoFactorEnabled: true
            });
            await this.logSecurityEvent('email_2fa_enabled');
            this.showInlineAlert('Email two-factor authentication enabled');
            await this.loadBiometricStatus();
            await this.loadSecurityScore();
        }
    }

    async disableEmailTwoFactorUI() {
        if (await this.showInlineConfirm('Are you sure you want to disable email two-factor authentication?')) {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                emailTwoFactorEnabled: firebase.firestore.FieldValue.delete()
            });
            await this.logSecurityEvent('email_2fa_disabled');
            this.showInlineAlert('Email two-factor authentication disabled');
            await this.loadBiometricStatus();
            await this.loadSecurityScore();
        }
    }

    toggleSection(sectionId) {
        const content = document.getElementById(`${sectionId}-content`);
        const toggle = document.getElementById(`${sectionId}-toggle`);
        
        if (!content || !toggle) return;
        
        const isHidden = content.style.display === 'none';
        
        if (isHidden) {
            // Show content
            content.style.display = 'block';
            toggle.style.transform = 'rotate(0deg)';
        } else {
            // Hide content
            content.style.display = 'none';
            toggle.style.transform = 'rotate(-90deg)';
        }
    }



    async loadSecurityScore() {
        const score = await this.calculateSecurityScore();
        const scoreElement = document.getElementById('securityScoreText');
        
        if (scoreElement) {
            scoreElement.textContent = score;
            
            // Update color based on score
            if (score >= 80) {
                scoreElement.style.color = '#28a745'; // Green
            } else if (score >= 60) {
                scoreElement.style.color = '#ffc107'; // Yellow
            } else {
                scoreElement.style.color = '#dc3545'; // Red
            }
        }
    }

    async loadSessionsData() {
        try {
            const sessions = await this.getSessions();
            const sessionsList = document.getElementById('sessionsList');
            const sessionCount = document.getElementById('sessionCount');
            
            if (!sessionsList || !sessionCount) return;
            
            sessionCount.textContent = sessions.length;
            sessionsList.innerHTML = '';

            sessions.forEach(session => {
                const isCurrentSession = session.id === this.currentSessionId;
                const item = document.createElement('div');
                item.className = `session-item ${isCurrentSession ? 'session-current' : ''}`;
                
                item.innerHTML = `
                    <div>
                        <strong>${session.browser || 'Unknown'} on ${session.device || 'Unknown'}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            ${session.ip} • ${formatTimestamp(session.lastActivity)}
                            ${isCurrentSession ? ' • <span style="color: #28a745; font-weight: bold;">Current Session</span>' : ''}
                        </div>
                    </div>
                    ${!isCurrentSession ? `<button class="btn btn-danger btn-sm" onclick="shieldManager.revokeSessionUI('${session.id}')">Revoke</button>` : '<span style="color: var(--success); font-weight: bold;">✓ Active</span>'}
                `;
                
                sessionsList.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading sessions data:', error);
        }
    }

    async loadHistoryData() {
        try {
            const history = await this.getLoginHistory();
            const historyList = document.getElementById('loginHistoryList');
            const loginCount = document.getElementById('loginCount');
            
            if (!historyList || !loginCount) return;
            
            loginCount.textContent = history.length;
            historyList.innerHTML = '';

            history.forEach(login => {
                const item = document.createElement('div');
                item.className = 'history-item';
                
                item.innerHTML = `
                    <div>
                        <strong>${login.location || 'Unknown Location'}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            ${login.ip} • ${formatTimestamp(login.timestamp)}
                        </div>
                    </div>
                    <span style="color: var(--success);">✓ Success</span>
                `;
                
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading history data:', error);
        }
    }

    async loadSecurityEvents() {
        const events = await this.getSecurityEvents();
        const eventsList = document.getElementById('securityEventsList');
        
        eventsList.innerHTML = '';

        events.forEach(event => {
            const item = document.createElement('div');
            item.className = 'event-item';
            
            item.innerHTML = `
                <div>
                    <strong>${this.formatEventType(event.type)}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${formatTimestamp(event.timestamp)}
                    </div>
                </div>
                <span style="color: var(--info);">ℹ️</span>
            `;
            
            eventsList.appendChild(item);
        });
    }

    formatEventType(type) {
        const types = {
            'recovery_key_regenerated': 'Recovery Key Regenerated',
            'data_exported': 'Data Exported',
            'fingerprint_enabled': 'Fingerprint Authentication Enabled',
            'fingerprint_disabled': 'Fingerprint Authentication Disabled',
            'authenticator_enabled': 'App Authenticator Enabled',
            'authenticator_disabled': 'App Authenticator Disabled',
            'email_2fa_enabled': 'Email Two-Factor Authentication Enabled',
            'email_2fa_disabled': 'Email Two-Factor Authentication Disabled'
        };
        return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async revokeSessionUI(sessionId) {
        try {
            // Actually delete the session document
            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').doc(sessionId).delete();
            
            window.showMessageBox('Session revoked successfully', 'success', 2000);
            
            // Refresh sessions list immediately
            await this.loadSessionsData();
        } catch (error) {
            console.error('Error revoking session:', error);
            window.showMessageBox('Failed to revoke session', 'error', 3000);
        }
    }

    async revokeAllSessionsUI() {
        showConfirmModal(
            'Sign Out All Other Sessions',
            'This will sign you out of all other devices and browsers. Your current session will remain active.',
            'Sign Out All',
            'Cancel',
            async () => {
                await this.revokeAllSessions();
                await this.cleanupOldSessions(); // Also cleanup old sessions
                window.showMessageBox('All other sessions signed out', 'success', 2000);
                await this.loadSessionsData();
            }
        );
    }

    async cleanupDuplicateSessions() {
        if (!this.authManager.currentUser) return;
        
        try {
            const sessions = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').where('isActive', '==', true).get();
            
            // Only cleanup truly old/invalid sessions
            const batch = this.db.batch();
            let deletedCount = 0;
            
            sessions.docs.forEach(doc => {
                const data = doc.data();
                const sessionAge = Date.now() - (data.createdAt?.toMillis() || 0);
                const isOld = sessionAge > (24 * 60 * 60 * 1000); // Older than 24 hours
                
                // Only delete sessions that are genuinely old
                if (isOld && doc.id !== this.currentSessionId) {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
            });
            
            if (deletedCount > 0) {
                await batch.commit();
            }
        } catch (error) {
            console.log('Session cleanup failed:', error.message);
        }
    }



    async regenerateRecoveryKeyUI() {
        if (!this.authManager.currentEncryptionKey) {
            window.showMessageBox('Please unlock your master password first', 'error', 3000);
            return;
        }

        showConfirmModal(
            'Generate New Recovery Key',
            'This will invalidate your current recovery key. Make sure you have it saved securely before continuing.',
            'Generate New Key',
            'Cancel',
            async () => {
                try {
                    const newKey = await this.regenerateRecoveryKey();
                    this.showRecoveryKey(newKey);
                    window.showMessageBox('Recovery key regenerated successfully', 'success', 2000);
                } catch (error) {
                    window.showMessageBox('Failed to regenerate recovery key', 'error', 3000);
                }
            }
        );
    }



    showRecoveryKey(recoveryKey) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;border:1px solid #333;">
                <h3 style="color:#e74c3c;margin-bottom:20px;">🛡️ NEW RECOVERY KEY</h3>
                <p style="margin-bottom:20px;color:white;">Your new recovery key:</p>
                <div style="background:#2d2d2d;color:#00ff00;padding:15px;border:2px solid #007bff;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:20px 0;word-break:break-all;">${recoveryKey}</div>
                <p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">Save this securely! Your old recovery key is now invalid.</p>
                <button onclick="this.parentElement.parentElement.remove()" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">I've Saved It</button>
            </div>
        `;
        document.body.appendChild(modal);
    }





    async loadBiometricStatus() {
        try {
            const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            const data = playerDoc.data() || {};
            
            const authenticatorStatus = document.getElementById('authenticatorStatus');
            const setupAuthenticatorBtn = document.getElementById('setupAuthenticator');
            const disableAuthenticatorBtn = document.getElementById('disableAuthenticator');
            
            const emailTwoFactorStatus = document.getElementById('emailTwoFactorStatus');
            const enableEmailTwoFactorBtn = document.getElementById('enableEmailTwoFactor');
            const disableEmailTwoFactorBtn = document.getElementById('disableEmailTwoFactor');
            
            const authenticatorEnabled = data.authenticatorEnabled === true && data.totpSecret;
            const emailTwoFactorEnabled = data.emailTwoFactorEnabled === true;
                
            if (authenticatorStatus) {
                authenticatorStatus.innerHTML = authenticatorEnabled ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
            
            if (emailTwoFactorStatus) {
                emailTwoFactorStatus.innerHTML = emailTwoFactorEnabled ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
            
            if (setupAuthenticatorBtn && disableAuthenticatorBtn) {
                setupAuthenticatorBtn.style.display = authenticatorEnabled ? 'none' : 'inline-block';
                disableAuthenticatorBtn.style.display = authenticatorEnabled ? 'inline-block' : 'none';
            }
            
            if (enableEmailTwoFactorBtn && disableEmailTwoFactorBtn) {
                enableEmailTwoFactorBtn.style.display = emailTwoFactorEnabled ? 'none' : 'inline-block';
                disableEmailTwoFactorBtn.style.display = emailTwoFactorEnabled ? 'inline-block' : 'none';
            }
        } catch (error) {
            console.error('Failed to load biometric status:', error);
        }
    }



    async setupAuthenticatorUI() {
        try {
            await this.setupAuthenticator();
            this.showInlineAlert('Authenticator app enabled with email fallback');
            await this.loadBiometricStatus();
            await this.loadSecurityScore();
        } catch (error) {
            this.showInlineAlert('Failed to setup authenticator: ' + error.message);
        }
    }





    async disableAuthenticatorUI() {
        if (await this.showInlineConfirm('Are you sure you want to disable authenticator app?')) {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                authenticatorEnabled: firebase.firestore.FieldValue.delete(),
                totpSecret: firebase.firestore.FieldValue.delete()
            });
            await this.logSecurityEvent('authenticator_disabled');
            this.showInlineAlert('Authenticator app disabled');
            await this.loadBiometricStatus();
            await this.loadSecurityScore();
        }
    }

    showInlineAlert(message, type = 'info') {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
        const colors = { success: '#00ff88', error: '#ff4444', info: '#00d4ff' };
        modal.innerHTML = `<div style="background:#1a1a1a;color:white;padding:30px;border-radius:12px;max-width:400px;text-align:center;border:1px solid #333;"><div style="color:${colors[type]};font-size:48px;margin-bottom:20px;">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</div><p style="margin-bottom:30px;color:#ccc;">${message}</p><button class="ok-btn" style="background:${colors[type]};color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">OK</button></div>`;
        document.body.appendChild(modal);
        
        const cleanup = () => {
            modal.remove();
        };
        
        const okBtn = modal.querySelector('.ok-btn');
        okBtn.onclick = cleanup;
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) cleanup();
        };
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                cleanup();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Auto-close after 5 seconds
        setTimeout(cleanup, 5000);
    }

    showInlineConfirm(message) {
        return new Promise((resolve) => {
            // Remove any existing modals first
            const existingModals = document.querySelectorAll('div[style*="z-index:10001"]');
            existingModals.forEach(modal => modal.remove());
            
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `<div style="background:#1a1a1a;color:white;padding:30px;border-radius:12px;max-width:400px;text-align:center;border:1px solid #333;"><div style="color:#ffaa00;font-size:48px;margin-bottom:20px;">⚠</div><p style="margin-bottom:30px;color:#ccc;">${message}</p><div><button class="confirm-btn" style="background:#ff4444;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Yes</button><button class="cancel-btn" style="background:#666;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Cancel</button></div></div>`;
            document.body.appendChild(modal);
            
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            
            // Close on escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape' && !isProcessing) {
                    isProcessing = true;
                    cleanup();
                    resolve(false);
                }
            };
            
            const cleanup = () => {
                // Remove event listeners
                document.removeEventListener('keydown', handleEscape);
                // Remove modal
                if (modal.parentNode) {
                    modal.remove();
                }
            };
            
            let isProcessing = false;
            
            confirmBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isProcessing) return;
                isProcessing = true;
                cleanup();
                resolve(true);
            };
            
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isProcessing) return;
                isProcessing = true;
                cleanup();
                resolve(false);
            };
            
            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal && !isProcessing) {
                    e.preventDefault();
                    e.stopPropagation();
                    isProcessing = true;
                    cleanup();
                    resolve(false);
                }
            };
            
            document.addEventListener('keydown', handleEscape);
        });
    }


}