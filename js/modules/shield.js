export class ShieldManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.currentSessionId = this.generateSessionId();
    }

    generateSessionId() {
        // Generate browser fingerprint for consistent session identification
        const fingerprint = this.generateBrowserFingerprint();
        let sessionId = sessionStorage.getItem('nsomatrix_session_id');
        if (!sessionId) {
            sessionId = fingerprint + '_' + Date.now().toString(36);
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
            await this.cleanupOldSessions();
            
            const fingerprint = this.generateBrowserFingerprint();
            const ip = await this.getClientIP();
            
            // Check for existing session with same fingerprint and IP
            const existingSessions = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('sessions')
                .where('fingerprint', '==', fingerprint)
                .where('ip', '==', ip)
                .where('isActive', '==', true)
                .get();
            
            if (!existingSessions.empty) {
                // Update existing session
                const existingSession = existingSessions.docs[0];
                this.currentSessionId = existingSession.id;
                sessionStorage.setItem('nsomatrix_session_id', this.currentSessionId);
                
                await existingSession.ref.update({
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            // Create new session
            const sessionData = {
                sessionId: this.currentSessionId,
                fingerprint: fingerprint,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                browser: this.getBrowserInfo(),
                device: this.getDeviceInfo(),
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
                browser: this.getBrowserInfo(),
                device: this.getDeviceInfo(),
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
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('loginHistory')
                .orderBy('timestamp', 'desc')
                .offset(50)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            if (!snapshot.empty) await batch.commit();
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

    // Device Detection
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Real Biometric Authentication
    async setupFingerprint() {
        if (!this.isMobileDevice()) {
            throw new Error('Fingerprint authentication can only be set up on mobile devices');
        }

        if (!window.PublicKeyCredential || !navigator.credentials) {
            throw new Error('WebAuthn not supported on this browser');
        }
        
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            throw new Error('WebAuthn requires HTTPS connection');
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { 
                    name: "NSO Matrix",
                    id: window.location.hostname
                },
                user: {
                    id: new TextEncoder().encode(this.authManager.currentUser.uid),
                    name: this.authManager.currentUser.email,
                    displayName: this.authManager.currentUser.displayName || this.authManager.currentUser.email
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },  // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    requireResidentKey: false
                },
                attestation: "direct",
                timeout: 60000
            }
        });

        // Store credential properly for verification
        await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
            fingerprintEnabled: true,
            fingerprintCredentialId: Array.from(new Uint8Array(credential.rawId)),
            fingerprintPublicKey: Array.from(new Uint8Array(credential.response.getPublicKey()))
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
        const issuer = 'NSO Matrix';
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
            const code = document.getElementById('totpVerifyCode').value.trim();
            if (code.length !== 6) {
                this.showInlineAlert('Please enter a 6-digit code', 'error');
                return;
            }
            
            try {
                const isValid = await this.verifyTOTP(secret, code);
                if (isValid) {
                    await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                        authenticatorEnabled: true,
                        totpSecret: secret
                    });
                    await this.logSecurityEvent('authenticator_enabled');
                    modal.remove();
                    resolve();
                } else {
                    this.showInlineAlert('Invalid code. Please check your authenticator app and try again.', 'error');
                }
            } catch (error) {
                console.error('TOTP verification error:', error);
                this.showInlineAlert('Verification failed. Please try again.', 'error');
            }
        };
        
        document.getElementById('cancelTOTPBtn').onclick = () => {
            modal.remove();
            reject(new Error('Setup cancelled'));
        };
    }

    async verifyTOTP(secret, token) {
        const timeWindow = Math.floor(Date.now() / 1000 / 30);
        for (let i = -1; i <= 1; i++) {
            const expectedToken = await this.generateTOTP(secret, timeWindow + i);
            if (expectedToken === token) {
                return true;
            }
        }
        return false;
    }

    async generateTOTP(secret, timeWindow) {
        const key = this.base32ToBytes(secret);
        const time = new ArrayBuffer(8);
        const timeView = new DataView(time);
        timeView.setUint32(4, timeWindow, false);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, time);
        const hmac = new Uint8Array(signature);
        
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                    ((hmac[offset + 1] & 0xff) << 16) |
                    ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
        
        return (code % 1000000).toString().padStart(6, '0');
    }

    base32ToBytes(base32) {
        // RFC 4648 compliant base32 decoding
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (let char of base32.toUpperCase()) {
            if (alphabet.indexOf(char) === -1) continue;
            bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            if (bits.substr(i, 8).length === 8) {
                bytes.push(parseInt(bits.substr(i, 8), 2));
            }
        }
        return new Uint8Array(bytes);
    }

    // Check if biometric authentication is enabled (either method)
    async requiresBiometricAuth() {
        if (!this.authManager.currentUser) return false;
        
        try {
            const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            const data = playerDoc.data() || {};
            
            return data.fingerprintEnabled || data.authenticatorEnabled;
        } catch (error) {
            return false;
        }
    }

    // Verify biometric authentication before dashboard access
    async verifyBiometricAuth() {
        const requiresAuth = await this.requiresBiometricAuth();
        if (!requiresAuth) return true;
        
        return new Promise((resolve) => {
            this.showBiometricVerificationModal(resolve);
        });
    }

    async showBiometricVerificationModal(resolve) {
        const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
        const data = playerDoc.data() || {};
        
        const hasFingerprintEnabled = data.fingerprintEnabled;
        const hasAuthenticatorEnabled = data.authenticatorEnabled;
        const isMobile = this.isMobileDevice();
        
        // Prefer fingerprint on mobile if available
        if (hasFingerprintEnabled && isMobile) {
            try {
                const credential = await navigator.credentials.get({
                    publicKey: {
                        challenge: crypto.getRandomValues(new Uint8Array(32)),
                        timeout: 60000,
                        userVerification: "required"
                    }
                });
                resolve(true);
                return;
            } catch (error) {
                // Fingerprint failed, fall back to authenticator if available
                if (!hasAuthenticatorEnabled) {
                    this.showInlineAlert('Fingerprint verification failed and no authenticator backup available', 'error');
                    resolve(false);
                    return;
                }
            }
        }
        
        // Show authenticator verification
        if (hasAuthenticatorEnabled) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10001;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
                <div style="background:#1a1a1a;color:white;padding:40px;border-radius:16px;max-width:400px;text-align:center;border:1px solid #333;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <h3 style="color:#00d4ff;margin-bottom:20px;font-size:24px;">🔐 Authentication Required</h3>
                    <p style="margin-bottom:30px;color:#ccc;line-height:1.5;">Enter your authenticator code to access the dashboard.</p>
                    
                    <div style="margin-bottom:20px;">
                        <input type="text" id="totpVerifyInput" placeholder="Enter 6-digit code" style="background:#2d2d2d;color:white;border:1px solid #555;padding:12px;margin:10px 0;width:150px;text-align:center;border-radius:8px;" maxlength="6" />
                        <br>
                        <button id="totpVerifyBtn" style="background:linear-gradient(135deg,#00ff88,#00cc6a);color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;font-weight:600;">✓ Verify Code</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            document.getElementById('totpVerifyBtn').onclick = async () => {
                const code = document.getElementById('totpVerifyInput').value.trim();
                if (code.length !== 6) {
                    this.showInlineAlert('Please enter a 6-digit code', 'error');
                    return;
                }
                
                try {
                    const isValid = await this.verifyTOTP(data.totpSecret, code);
                    if (isValid) {
                        modal.remove();
                        resolve(true);
                    } else {
                        this.showInlineAlert('Invalid code. Please try again.', 'error');
                    }
                } catch (error) {
                    console.error('TOTP verification error:', error);
                    this.showInlineAlert('Verification failed. Please try again.', 'error');
                }
            };
        } else {
            // No authentication methods available
            resolve(true);
        }
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
        this.setupModalHandlers();
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
        // Setup biometric buttons
        document.getElementById('setupFingerprint')?.addEventListener('click', () => this.setupFingerprintUI());
        document.getElementById('setupAuthenticator')?.addEventListener('click', () => this.setupAuthenticatorUI());
        document.getElementById('disableFingerprint')?.addEventListener('click', () => this.disableFingerprintUI());
        document.getElementById('disableAuthenticator')?.addEventListener('click', () => this.disableAuthenticatorUI());
    }

    toggleSection(sectionId) {
        const content = document.getElementById(`${sectionId}-content`);
        const toggle = document.getElementById(`${sectionId}-toggle`);
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            toggle.classList.remove('rotated');
        } else {
            content.classList.add('collapsed');
            toggle.classList.add('rotated');
        }
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
            'fingerprint_disabled': 'Fingerprint Authentication Disabled',
            'authenticator_enabled': 'App Authenticator Enabled',
            'authenticator_disabled': 'App Authenticator Disabled'
        };
        return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async revokeSession(sessionId) {
        await this.revokeSession(sessionId);
        window.showMessageBox('Session revoked successfully', 'success', 2000);
        this.loadSessionsData();
    }

    async revokeAllSessionsUI() {
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
                    <button onclick="this.parentElement.parentElement.parentElement.remove();document.body.classList.remove('modal-open');" style="background:#2d2d2d;color:#ccc;border:1px solid #555;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${cancelText}</button>
                    <button id="confirmBtn" style="background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        
        modal.querySelector('#confirmBtn').onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            onConfirm();
        };
    }

    async regenerateRecoveryKeyUI() {
        if (!this.authManager.currentEncryptionKey) {
            window.showMessageBox('Please unlock your master password first', 'error', 3000);
            return;
        }

        this.showConfirmModal(
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

    async generateBackupCodesUI() {
        this.showConfirmModal(
            'Generate Backup Codes',
            'This will replace any existing backup codes. Save the new codes in a secure location.',
            'Generate Codes',
            'Cancel',
            async () => {
                const codes = await this.generateBackupCodes();
                this.displayBackupCodes(codes);
                await this.logSecurityEvent('backup_codes_generated');
                window.showMessageBox('Backup codes generated successfully', 'success', 2000);
            }
        );
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

    async exportDataUI() {
        this.showConfirmModal(
            'Download Your Data',
            'This will create a JSON file containing all your account data including notes, passwords, and security information.',
            'Download Data',
            'Cancel',
            async () => {
                try {
                    const data = await this.exportUserData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nsomatrix-data-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    window.showMessageBox('Data exported successfully', 'success', 2000);
                } catch (error) {
                    window.showMessageBox('Failed to export data', 'error', 3000);
                }
            }
        );
    }

    async lockdownAccountUI() {
        this.showConfirmModal(
            'Deactivate Account',
            'This will temporarily deactivate your account and sign you out of all devices. You can reactivate by logging in again.',
            'Deactivate Account',
            'Cancel',
            async () => {
                try {
                    await this.lockdownAccount();
                    window.showMessageBox('Account deactivated successfully', 'success', 2000);
                    setTimeout(() => {
                        firebase.auth().signOut();
                        window.location.href = 'login.html';
                    }, 2000);
                } catch (error) {
                    window.showMessageBox('Failed to deactivate account', 'error', 3000);
                }
            }
        );
    }

    async loadBiometricStatus() {
        try {
            const playerDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            const data = playerDoc.data() || {};
            
            const fingerprintStatus = document.getElementById('fingerprintStatus');
            const authenticatorStatus = document.getElementById('authenticatorStatus');
            const setupFingerprintBtn = document.getElementById('setupFingerprint');
            const disableFingerprintBtn = document.getElementById('disableFingerprint');
            const setupAuthenticatorBtn = document.getElementById('setupAuthenticator');
            const disableAuthenticatorBtn = document.getElementById('disableAuthenticator');
            
            const fingerprintEnabled = data.fingerprintEnabled && data.fingerprintCredentialId;
            const authenticatorEnabled = data.authenticatorEnabled && data.totpSecret;
            
            if (fingerprintStatus) {
                fingerprintStatus.innerHTML = fingerprintEnabled ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
            
            if (setupFingerprintBtn && disableFingerprintBtn) {
                setupFingerprintBtn.style.display = fingerprintEnabled ? 'none' : 'inline-block';
                disableFingerprintBtn.style.display = fingerprintEnabled ? 'inline-block' : 'none';
            }
                
            if (authenticatorStatus) {
                authenticatorStatus.innerHTML = authenticatorEnabled ? 
                    '<span style="color: var(--success);">✅ Enabled</span>' : 
                    '<span style="color: var(--text-muted);">❌ Disabled</span>';
            }
            
            if (setupAuthenticatorBtn && disableAuthenticatorBtn) {
                setupAuthenticatorBtn.style.display = authenticatorEnabled ? 'none' : 'inline-block';
                disableAuthenticatorBtn.style.display = authenticatorEnabled ? 'inline-block' : 'none';
            }
        } catch (error) {
            console.log('Failed to load biometric status:', error.message);
        }
    }

    async setupFingerprintUI() {
        if (!this.isMobileDevice()) {
            this.showInlineAlert('Fingerprint authentication can only be set up on mobile devices. Please use your phone to enable this feature.');
            return;
        }
        
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            this.showInlineAlert('Fingerprint authentication requires HTTPS connection. Please access the site via HTTPS.');
            return;
        }
        
        try {
            await this.setupFingerprint();
            this.showInlineAlert('Fingerprint authentication enabled');
            this.loadBiometricStatus();
        } catch (error) {
            this.showInlineAlert('Failed to setup fingerprint: ' + error.message);
        }
    }

    async setupAuthenticatorUI() {
        try {
            await this.setupAuthenticator();
            this.showInlineAlert('Authenticator app enabled');
            this.loadBiometricStatus();
        } catch (error) {
            this.showInlineAlert('Failed to setup authenticator: ' + error.message);
        }
    }

    async disableFingerprintUI() {
        const verified = await this.verifyBiometricAuth();
        if (!verified) {
            this.showInlineAlert('Authentication required to disable fingerprint');
            return;
        }
        
        if (await this.showInlineConfirm('Are you sure you want to disable fingerprint authentication?')) {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                fingerprintEnabled: firebase.firestore.FieldValue.delete(),
                fingerprintCredentialId: firebase.firestore.FieldValue.delete(),
                fingerprintPublicKey: firebase.firestore.FieldValue.delete()
            });
            await this.logSecurityEvent('fingerprint_disabled');
            this.showInlineAlert('Fingerprint authentication disabled');
            this.loadBiometricStatus();
        }
    }

    async disableAuthenticatorUI() {
        const verified = await this.verifyBiometricAuth();
        if (!verified) {
            this.showInlineAlert('Authentication required to disable authenticator');
            return;
        }
        
        if (await this.showInlineConfirm('Are you sure you want to disable authenticator app?')) {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).update({
                authenticatorEnabled: firebase.firestore.FieldValue.delete(),
                totpSecret: firebase.firestore.FieldValue.delete()
            });
            await this.logSecurityEvent('authenticator_disabled');
            this.showInlineAlert('Authenticator app disabled');
            this.loadBiometricStatus();
        }
    }

    showInlineAlert(message, type = 'info') {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
        const colors = { success: '#00ff88', error: '#ff4444', info: '#00d4ff' };
        modal.innerHTML = `<div style="background:#1a1a1a;color:white;padding:30px;border-radius:12px;max-width:400px;text-align:center;border:1px solid #333;"><div style="color:${colors[type]};font-size:48px;margin-bottom:20px;">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</div><p style="margin-bottom:30px;color:#ccc;">${message}</p><button onclick="this.parentElement.parentElement.remove()" style="background:${colors[type]};color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">OK</button></div>`;
        document.body.appendChild(modal);
        setTimeout(() => modal.remove(), 5000);
    }

    showInlineConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `<div style="background:#1a1a1a;color:white;padding:30px;border-radius:12px;max-width:400px;text-align:center;border:1px solid #333;"><div style="color:#ffaa00;font-size:48px;margin-bottom:20px;">⚠</div><p style="margin-bottom:30px;color:#ccc;">${message}</p><div><button onclick="this.parentElement.parentElement.parentElement.remove();window.tempResolve(true)" style="background:#ff4444;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Yes</button><button onclick="this.parentElement.parentElement.parentElement.remove();window.tempResolve(false)" style="background:#666;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Cancel</button></div></div>`;
            document.body.appendChild(modal);
            window.tempResolve = resolve;
        });
    }
}