export class ShieldManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.currentSessionId = this.generateSessionId();
    }

    generateSessionId() {
        // Use persistent session ID based on browser fingerprint
        let sessionId = localStorage.getItem('ninjabase_session_id');
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            localStorage.setItem('ninjabase_session_id', sessionId);
        }
        return sessionId;
    }

    // Session Management
    async createSession() {
        if (!this.authManager.currentUser) return;
        
        try {
            // Clean up old sessions first
            await this.cleanupOldSessions();
            
            // Check if session already exists
            const existingSession = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions').doc(this.currentSessionId).get();
            
            if (existingSession.exists) {
                // Update existing session
                await this.db.collection('players').doc(this.authManager.currentUser.uid)
                    .collection('sessions').doc(this.currentSessionId).update({
                        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                    });
                return;
            }

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

    async cleanupOldSessions() {
        if (!this.authManager.currentUser) return;
        
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const oldSessions = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions')
                .where('lastActivity', '<', sevenDaysAgo)
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
            const now = new Date();
            const today = now.toDateString();
            const ip = await this.getClientIP();
            
            // Check for existing login today from same IP
            const existingLogin = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory')
                .where('date', '==', today)
                .where('ip', '==', ip)
                .limit(1)
                .get();
            
            if (!existingLogin.empty) {
                // Update existing login time
                const loginDoc = existingLogin.docs[0];
                await loginDoc.ref.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            const loginData = {
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                ip: ip,
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
        
        try {
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory')
                .limit(10)
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

    // Real Biometric Authentication
    async setupFingerprint() {
        if (!window.PublicKeyCredential || !navigator.credentials) {
            throw new Error('WebAuthn not supported on this device');
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { 
                    name: "NinjaBase",
                    id: window.location.hostname
                },
                user: {
                    id: new TextEncoder().encode(this.authManager.currentUser.uid),
                    name: this.authManager.currentUser.email,
                    displayName: this.authManager.currentUser.displayName || this.authManager.currentUser.email
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000
            }
        });

        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            fingerprintEnabled: true,
            fingerprintCredentialId: Array.from(new Uint8Array(credential.rawId))
        });

        await this.logSecurityEvent('fingerprint_enabled');
    }

    // Real TOTP Authenticator
    async setupAuthenticator() {
        const secret = this.generateTOTPSecret();
        const qrCodeUrl = this.generateQRCodeURL(secret);
        
        return new Promise((resolve, reject) => {
            this.showAuthenticatorModal(qrCodeUrl, secret, resolve, reject);
        });
    }

    generateTOTPSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    generateQRCodeURL(secret) {
        const issuer = 'NinjaBase';
        const accountName = this.authManager.currentUser.email;
        const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
    }

    showAuthenticatorModal(qrCodeUrl, secret, resolve, reject) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#e74c3c;margin-bottom:20px;">📱 Setup Authenticator App</h3>
                <p>1. Install Google Authenticator or Authy</p>
                <p>2. Scan this QR code:</p>
                <img src="${qrCodeUrl}" style="margin:20px 0;border:1px solid #333;" />
                <p style="font-size:12px;color:#888;margin-bottom:20px;">Or enter manually: <br><code style="background:#2d2d2d;padding:5px;word-break:break-all;">${secret}</code></p>
                <input type="text" id="totpVerifyCode" placeholder="Enter 6-digit code" style="background:#2d2d2d;color:white;border:1px solid #555;padding:10px;margin:10px 0;width:150px;text-align:center;" maxlength="6" />
                <div>
                    <button id="verifyTOTPBtn" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">Verify & Enable</button>
                    <button id="cancelTOTPBtn" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('verifyTOTPBtn').onclick = async () => {
            const code = document.getElementById('totpVerifyCode').value;
            if (this.verifyTOTP(secret, code)) {
                await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                    authenticatorEnabled: true,
                    totpSecret: secret
                });
                await this.logSecurityEvent('authenticator_enabled');
                modal.remove();
                resolve();
            } else {
                alert('Invalid code. Please try again.');
            }
        };
        
        document.getElementById('cancelTOTPBtn').onclick = () => {
            modal.remove();
            reject(new Error('Setup cancelled'));
        };
    }

    verifyTOTP(secret, token) {
        const window = Math.floor(Date.now() / 1000 / 30);
        for (let i = -1; i <= 1; i++) {
            if (this.generateTOTP(secret, window + i) === token) {
                return true;
            }
        }
        return false;
    }

    generateTOTP(secret, timeWindow) {
        // Simple TOTP implementation
        const key = this.base32ToBytes(secret);
        const time = new ArrayBuffer(8);
        const timeView = new DataView(time);
        timeView.setUint32(4, timeWindow, false);
        
        return this.hmacSha1(key, new Uint8Array(time))
            .slice(-4)
            .reduce((acc, byte, i) => acc + (byte << (8 * (3 - i))), 0)
            .toString()
            .slice(-6)
            .padStart(6, '0');
    }

    base32ToBytes(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (let char of base32) {
            bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        return new Uint8Array(bytes);
    }

    hmacSha1(key, data) {
        // Simplified HMAC-SHA1 for TOTP
        const blockSize = 64;
        if (key.length > blockSize) {
            key = this.sha1(key);
        }
        const keyPadded = new Uint8Array(blockSize);
        keyPadded.set(key);
        
        const oKeyPad = keyPadded.map(b => b ^ 0x5c);
        const iKeyPad = keyPadded.map(b => b ^ 0x36);
        
        const inner = new Uint8Array(blockSize + data.length);
        inner.set(iKeyPad);
        inner.set(data, blockSize);
        
        const innerHash = this.sha1(inner);
        const outer = new Uint8Array(blockSize + innerHash.length);
        outer.set(oKeyPad);
        outer.set(innerHash, blockSize);
        
        return this.sha1(outer);
    }

    sha1(data) {
        // Basic SHA1 implementation
        const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
        const msg = new Uint8Array(data.length + 9 + (64 - ((data.length + 9) % 64)) % 64);
        msg.set(data);
        msg[data.length] = 0x80;
        new DataView(msg.buffer).setUint32(msg.length - 4, data.length * 8, false);
        
        for (let i = 0; i < msg.length; i += 64) {
            const w = new Uint32Array(80);
            for (let j = 0; j < 16; j++) {
                w[j] = new DataView(msg.buffer).getUint32(i + j * 4, false);
            }
            for (let j = 16; j < 80; j++) {
                w[j] = this.rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
            }
            
            let [a, b, c, d, e] = h;
            for (let j = 0; j < 80; j++) {
                const f = j < 20 ? (b & c) | (~b & d) :
                         j < 40 ? b ^ c ^ d :
                         j < 60 ? (b & c) | (b & d) | (c & d) :
                         b ^ c ^ d;
                const k = j < 20 ? 0x5A827999 :
                         j < 40 ? 0x6ED9EBA1 :
                         j < 60 ? 0x8F1BBCDC :
                         0xCA62C1D6;
                const temp = (this.rotateLeft(a, 5) + f + e + k + w[j]) >>> 0;
                e = d; d = c; c = this.rotateLeft(b, 30); b = a; a = temp;
            }
            h[0] = (h[0] + a) >>> 0;
            h[1] = (h[1] + b) >>> 0;
            h[2] = (h[2] + c) >>> 0;
            h[3] = (h[3] + d) >>> 0;
            h[4] = (h[4] + e) >>> 0;
        }
        
        const result = new Uint8Array(20);
        for (let i = 0; i < 5; i++) {
            new DataView(result.buffer).setUint32(i * 4, h[i], false);
        }
        return result;
    }

    rotateLeft(n, s) {
        return (n << s) | (n >>> (32 - s));
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
        await this.loadSecurityEvents();
        await this.loadBiometricStatus();
        this.setupShieldTabs();
    }

    setupShieldTabs() {
        // Setup biometric buttons
        document.getElementById('setupFingerprint')?.addEventListener('click', () => this.setupFingerprintUI());
        document.getElementById('setupAuthenticator')?.addEventListener('click', () => this.setupAuthenticatorUI());
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
        this.showConfirmModal(
            'Sign Out All Other Sessions',
            'This will sign you out of all other devices and browsers. Your current session will remain active.',
            'Sign Out All',
            'Cancel',
            async () => {
                await this.revokeAllSessions();
                window.showMessageBox('All other sessions signed out', 'success', 2000);
                this.loadSessionsData();
            }
        );
    }

    showConfirmModal(title, message, confirmText, cancelText, onConfirm) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);border:1px solid #333;">
                <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:white;">${title}</h3>
                <p style="margin:0 0 24px 0;color:#ccc;line-height:1.5;">${message}</p>
                <div style="display:flex;gap:12px;justify-content:flex-end;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:#2d2d2d;color:#ccc;border:1px solid #555;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${cancelText}</button>
                    <button id="confirmBtn" style="background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#confirmBtn').onclick = () => {
            modal.remove();
            onConfirm();
        };
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
        try {
            const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            const data = playerDoc.data() || {};
            
            const fingerprintStatus = document.getElementById('fingerprintStatus');
            const authenticatorStatus = document.getElementById('authenticatorStatus');
            
            if (fingerprintStatus) {
                fingerprintStatus.innerHTML = (data.fingerprintEnabled && data.fingerprintCredentialId) ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
                
            if (authenticatorStatus) {
                authenticatorStatus.innerHTML = (data.authenticatorEnabled && data.totpSecret) ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
        } catch (error) {
            console.log('Failed to load biometric status:', error.message);
        }
    }

    async setupFingerprintUI() {
        try {
            await this.setupFingerprint();
            window.showMessageBox('Fingerprint authentication enabled', 'success', 2000);
            this.loadBiometricStatus();
        } catch (error) {
            window.showMessageBox('Failed to setup fingerprint: ' + error.message, 'error', 3000);
        }
    }

    async setupAuthenticatorUI() {
        try {
            await this.setupAuthenticator();
            window.showMessageBox('Authenticator app enabled', 'success', 2000);
            this.loadBiometricStatus();
        } catch (error) {
            window.showMessageBox('Failed to setup authenticator: ' + error.message, 'error', 3000);
        }
    }
}