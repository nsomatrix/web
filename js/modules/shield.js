export class ShieldManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.currentSessionId = this.generateSessionId();
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Session Management
    async createSession() {
        if (!this.authManager.currentUser) return;
        
        try {
            const sessionData = {
                sessionId: this.currentSessionId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                ip: await this.getClientIP(),
                isActive: true
            };

            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').doc(this.currentSessionId).set(sessionData);
        } catch (error) {
            console.log('Session creation failed (rules not deployed yet):', error.message);
        }
    }

    async getSessions() {
        if (!this.authManager.currentUser) return [];
        
        const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('sessions').where('isActive', '==', true).get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async revokeSession(sessionId) {
        if (!this.authManager.currentUser) return;
        
        await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('sessions').doc(sessionId).update({ isActive: false });
    }

    async revokeAllSessions() {
        const sessions = await this.getSessions();
        const batch = this.db.batch();
        
        sessions.forEach(session => {
            if (session.id !== this.currentSessionId) {
                const ref = this.db.collection('players').doc(this.authManager.currentUser.uid)
                    .collection('sessions').doc(session.id);
                batch.update(ref, { isActive: false });
            }
        });
        
        await batch.commit();
    }

    // Login History
    async recordLogin() {
        if (!this.authManager.currentUser) return;
        
        try {
            const loginData = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: await this.getClientIP(),
                userAgent: navigator.userAgent,
                success: true,
                location: await this.getLocation()
            };

            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory').add(loginData);
        } catch (error) {
            console.log('Login recording failed (rules not deployed yet):', error.message);
        }
    }

    async getLoginHistory() {
        if (!this.authManager.currentUser) return [];
        
        const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('loginHistory').orderBy('timestamp', 'desc').limit(10).get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            const daysSinceLogin = (Date.now() - lastLogin.timestamp.toMillis()) / (1000 * 60 * 60 * 24);
            if (daysSinceLogin < 7) score += 15;
        }

        // Active sessions management (10 points)
        const sessions = await this.getSessions();
        if (sessions.length <= 3) score += 10;

        // Email verification (5 points)
        if (this.authManager.currentUser.emailVerified) score += 5;

        // Biometric authentication (10 points)
        if (data.fingerprintEnabled || data.authenticatorEnabled) score += 10;

        // Account age (5 points)
        const accountAge = (Date.now() - this.authManager.currentUser.metadata.creationTime) / (1000 * 60 * 60 * 24);
        if (accountAge > 30) score += 5;

        return Math.min(score, 100);
    }

    // Backup Codes
    async generateBackupCodes() {
        if (!this.authManager.currentUser) return [];
        
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(this.generateBackupCode());
        }

        const batch = this.db.batch();
        
        // Clear existing codes
        const existingCodes = await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('backupCodes').get();
        existingCodes.forEach(doc => batch.delete(doc.ref));

        // Add new codes
        codes.forEach(code => {
            const ref = this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('backupCodes').doc();
            batch.set(ref, {
                code: code,
                used: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        return codes;
    }

    generateBackupCode() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
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

    // Data Export
    async exportUserData() {
        if (!this.authManager.currentUser) return null;
        
        const userData = {
            profile: {},
            notes: [],
            passwords: [],
            friends: [],
            loginHistory: [],
            securityEvents: [],
            exportedAt: new Date().toISOString()
        };

        // Get profile
        const profileDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
        userData.profile = profileDoc.data();

        // Get encrypted data (notes, passwords)
        if (this.authManager.currentEncryptionKey) {
            const notesSnapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('notes').get();
            userData.notes = notesSnapshot.docs.map(doc => doc.data());

            const passwordsSnapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('passwords').get();
            userData.passwords = passwordsSnapshot.docs.map(doc => doc.data());
        }

        // Get friends
        const friendsSnapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
            .collection('friends').get();
        userData.friends = friendsSnapshot.docs.map(doc => doc.data());

        // Get login history
        userData.loginHistory = await this.getLoginHistory();
        
        // Get security events
        userData.securityEvents = await this.getSecurityEvents();

        await this.logSecurityEvent('data_exported');
        return userData;
    }

    // Account Lockdown
    async lockdownAccount() {
        if (!this.authManager.currentUser) return;
        
        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            accountLocked: true,
            lockedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await this.revokeAllSessions();
        await this.logSecurityEvent('account_locked');
    }

    async unlockAccount() {
        if (!this.authManager.currentUser) return;
        
        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            accountLocked: false,
            unlockedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await this.logSecurityEvent('account_unlocked');
    }

    // Biometric Authentication
    async setupFingerprint() {
        if (!window.PublicKeyCredential) {
            throw new Error('WebAuthn not supported');
        }

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new Uint8Array(32),
                rp: { name: "NinjaBase" },
                user: {
                    id: new TextEncoder().encode(this.authManager.currentUser.uid),
                    name: this.authManager.currentUser.email,
                    displayName: this.authManager.currentUser.displayName || this.authManager.currentUser.email
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                }
            }
        });

        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            fingerprintEnabled: true,
            fingerprintCredentialId: Array.from(new Uint8Array(credential.rawId))
        });

        await this.logSecurityEvent('fingerprint_enabled');
        return true;
    }

    async setupAuthenticator() {
        if (!window.PublicKeyCredential) {
            throw new Error('WebAuthn not supported');
        }

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new Uint8Array(32),
                rp: { name: "NinjaBase" },
                user: {
                    id: new TextEncoder().encode(this.authManager.currentUser.uid),
                    name: this.authManager.currentUser.email,
                    displayName: this.authManager.currentUser.displayName || this.authManager.currentUser.email
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "cross-platform",
                    userVerification: "preferred"
                }
            }
        });

        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            authenticatorEnabled: true,
            authenticatorCredentialId: Array.from(new Uint8Array(credential.rawId))
        });

        await this.logSecurityEvent('authenticator_enabled');
        return true;
    }

    // Utility functions
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

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return browser;
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'Mobile';
        if (/Tablet|iPad/.test(ua)) return 'Tablet';
        return 'Desktop';
    }

    // UI Management Methods
    async loadShieldData() {
        await this.loadSecurityScore();
        await this.loadSessionsData();
        await this.loadHistoryData();
        this.setupShieldTabs();
    }

    setupShieldTabs() {
        // Main tabs
        document.querySelectorAll('.shield-tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });

        // Sub tabs
        document.querySelectorAll('.shield-tab-sub').forEach(tab => {
            tab.onclick = () => this.switchSubTab(tab.dataset.subtab);
        });

        // Setup biometric buttons
        document.getElementById('setupFingerprint')?.addEventListener('click', () => this.setupFingerprint());
        document.getElementById('setupAuthenticator')?.addEventListener('click', () => this.setupAuthenticator());
    }

    switchTab(tabName) {
        document.querySelectorAll('.shield-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.shield-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`shield-${tabName}`).classList.add('active');

        // Load data for specific tabs
        if (tabName === 'sessions') this.loadSessionsData();
        if (tabName === 'history') this.loadHistoryData();
        if (tabName === 'privacy') this.loadBiometricStatus();
    }

    switchSubTab(subtabName) {
        document.querySelectorAll('.shield-tab-sub').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.shield-subcontent').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-subtab="${subtabName}"]`).classList.add('active');
        document.getElementById(`${subtabName === 'logins' ? 'loginHistoryList' : 'securityEventsList'}`).classList.add('active');

        if (subtabName === 'events') this.loadSecurityEvents();
    }

    async loadSecurityScore() {
        const score = await this.calculateSecurityScore();
        const scoreElement = document.getElementById('securityScoreText');
        const circleElement = document.getElementById('securityScoreCircle');
        
        scoreElement.textContent = score;
        
        if (score >= 80) {
            circleElement.className = 'score-circle excellent';
        } else if (score >= 60) {
            circleElement.className = 'score-circle good';
        } else {
            circleElement.className = 'score-circle poor';
        }
    }

    async loadSessionsData() {
        const sessions = await this.getSessions();
        const sessionsList = document.getElementById('sessionsList');
        const sessionCount = document.getElementById('sessionCount');
        
        sessionCount.textContent = sessions.length;
        sessionsList.innerHTML = '';

        sessions.forEach(session => {
            const isCurrentSession = session.id === this.currentSessionId;
            const item = document.createElement('div');
            item.className = `session-item ${isCurrentSession ? 'session-current' : ''}`;
            
            item.innerHTML = `
                <div>
                    <strong>${this.getBrowserInfo()} on ${this.getDeviceInfo()}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${session.ip} • ${this.formatTimestamp(session.lastActivity)}
                        ${isCurrentSession ? ' • Current Session' : ''}
                    </div>
                </div>
                ${!isCurrentSession ? `<button class="btn btn-danger btn-sm" onclick="shieldManager.revokeSession('${session.id}')">Revoke</button>` : '<span style="color: var(--success);">Active</span>'}
            `;
            
            sessionsList.appendChild(item);
        });
    }

    async loadHistoryData() {
        const history = await this.getLoginHistory();
        const historyList = document.getElementById('loginHistoryList');
        const loginCount = document.getElementById('loginCount');
        
        loginCount.textContent = history.length;
        historyList.innerHTML = '';

        history.forEach(login => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            item.innerHTML = `
                <div>
                    <strong>${login.location || 'Unknown Location'}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${login.ip} • ${this.formatTimestamp(login.timestamp)}
                    </div>
                </div>
                <span style="color: var(--success);">✓ Success</span>
            `;
            
            historyList.appendChild(item);
        });
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
                        ${this.formatTimestamp(event.timestamp)}
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
            'account_locked': 'Account Locked',
            'account_unlocked': 'Account Unlocked',
            'backup_codes_generated': 'Backup Codes Generated',
            'fingerprint_enabled': 'Fingerprint Authentication Enabled',
            'authenticator_enabled': 'Hardware Authenticator Enabled'
        };
        return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async revokeSession(sessionId) {
        await this.revokeSession(sessionId);
        window.showMessageBox('Session revoked successfully', 'success', 2000);
        this.loadSessionsData();
    }

    async revokeAllSessions() {
        if (confirm('This will log you out of all other devices. Continue?')) {
            await this.revokeAllSessions();
            window.showMessageBox('All other sessions revoked', 'success', 2000);
            this.loadSessionsData();
        }
    }

    async regenerateRecoveryKey() {
        if (!this.authManager.currentEncryptionKey) {
            window.showMessageBox('Please unlock your master password first', 'error', 3000);
            return;
        }

        if (confirm('This will invalidate your current recovery key. Continue?')) {
            try {
                const newKey = await this.regenerateRecoveryKey();
                this.showRecoveryKey(newKey);
                window.showMessageBox('Recovery key regenerated successfully', 'success', 2000);
            } catch (error) {
                window.showMessageBox('Failed to regenerate recovery key', 'error', 3000);
            }
        }
    }

    async generateBackupCodes() {
        if (confirm('This will replace any existing backup codes. Continue?')) {
            const codes = await this.generateBackupCodes();
            this.displayBackupCodes(codes);
            await this.logSecurityEvent('backup_codes_generated');
            window.showMessageBox('Backup codes generated successfully', 'success', 2000);
        }
    }

    displayBackupCodes(codes) {
        const codesList = document.getElementById('backupCodesList');
        codesList.innerHTML = `
            <div class="backup-codes-grid">
                ${codes.map(code => `<div class="backup-code">${code}</div>`).join('')}
            </div>
            <p style="color: var(--warning); margin-top: 1rem;">⚠️ Save these codes securely. Each can only be used once.</p>
        `;
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

    async exportData() {
        if (confirm('This will export all your data. Continue?')) {
            try {
                const data = await this.exportUserData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ninjabase-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                window.showMessageBox('Data exported successfully', 'success', 2000);
            } catch (error) {
                window.showMessageBox('Failed to export data', 'error', 3000);
            }
        }
    }

    async lockdownAccount() {
        if (confirm('This will lock your account and log you out of all devices. You can unlock it by logging in again. Continue?')) {
            try {
                await this.lockdownAccount();
                window.showMessageBox('Account locked successfully', 'success', 2000);
                setTimeout(() => {
                    firebase.auth().signOut();
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                window.showMessageBox('Failed to lock account', 'error', 3000);
            }
        }
    }

    async loadBiometricStatus() {
        const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
        const data = playerDoc.data();
        
        const fingerprintStatus = document.getElementById('fingerprintStatus');
        const authenticatorStatus = document.getElementById('authenticatorStatus');
        
        fingerprintStatus.innerHTML = data.fingerprintEnabled ? 
            '<span style="color: var(--success);">✅ Enabled</span>' : 
            '<span style="color: var(--text-muted);">❌ Disabled</span>';
            
        authenticatorStatus.innerHTML = data.authenticatorEnabled ? 
            '<span style="color: var(--success);">✅ Enabled</span>' : 
            '<span style="color: var(--text-muted);">❌ Disabled</span>';
    }

    async setupFingerprint() {
        try {
            await this.setupFingerprint();
            window.showMessageBox('Fingerprint authentication enabled', 'success', 2000);
            this.loadBiometricStatus();
        } catch (error) {
            window.showMessageBox('Failed to setup fingerprint: ' + error.message, 'error', 3000);
        }
    }

    async setupAuthenticator() {
        try {
            await this.setupAuthenticator();
            window.showMessageBox('Hardware authenticator enabled', 'success', 2000);
            this.loadBiometricStatus();
        } catch (error) {
            window.showMessageBox('Failed to setup authenticator: ' + error.message, 'error', 3000);
        }
    }
}