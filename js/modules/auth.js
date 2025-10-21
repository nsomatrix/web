import { CRYPTO_CONFIG } from './config.js';
import { deriveKey } from './crypto.js';
import { showMessageBox, openModal, closeModal } from './ui.js';

export class AuthManager {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
        this.currentEncryptionKey = null;
        this.failedUnlockAttempts = 0;
        this.unlockLocked = false;
        this.sessionExpiryTimer = null;
        
        this.initSessionTimer();
    }

    initSessionTimer() {
        const startTimer = () => {
            clearTimeout(this.sessionExpiryTimer);
            this.sessionExpiryTimer = setTimeout(async () => {
                console.warn("Session expired due to inactivity. Clearing encryption key.");
                this.currentEncryptionKey = null;
                this.secureRemoveKey('currentEncryptionKeyHex');
                
                // Check if account needs recovery key
                const needsRecovery = await this.checkPasswordResetStatus();
                if (needsRecovery) {
                    showMessageBox("Session expired. Please use your recovery key to access encrypted data.", 'warning', 4000);
                } else {
                    showMessageBox("Session expired due to inactivity. Please re-enter master password.", 'warning', 3000);
                }
            }, CRYPTO_CONFIG.SESSION_TIMEOUT);
        };

        document.addEventListener('mousemove', startTimer);
        document.addEventListener('keydown', startTimer);
        document.addEventListener('click', startTimer);
        startTimer();
    }

    async unlockDashboard(masterPassword) {
        if (this.unlockLocked) {
            showMessageBox("Too many failed attempts. Please wait.", "error", 3000);
            return false;
        }

        if (!masterPassword) {
            showMessageBox("Please enter master password", "error", 3000);
            return false;
        }

        const user = this.currentUser || this.auth.currentUser;
        if (!user) {
            showMessageBox("Please login first", "error", 3000);
            return false;
        }

        try {
            const playerDocRef = this.db.collection("players").doc(user.uid);
            const playerDoc = await playerDocRef.get();
            const data = playerDoc.data();

            if (!data || !data.salt || !data.masterPasswordHash) {
                showMessageBox("No master password set yet", "info", 3000);
                return false;
            }

            // Check if account was recovered from key (password was reset)
            if (data.recoveredFromKey) {
                showMessageBox("Password was reset. Please use your recovery key to access encrypted data.", "warning", 5000);
                this.currentEncryptionKey = null;
                return false;
            }

            const derivedKeyForVerification = await deriveKey(masterPassword, data.salt);
            const derivedMasterPasswordHash = derivedKeyForVerification.toString(CryptoJS.enc.Hex);

            if (derivedMasterPasswordHash !== data.masterPasswordHash) {
                this.failedUnlockAttempts++;
                if (this.failedUnlockAttempts >= CRYPTO_CONFIG.MAX_ATTEMPTS) {
                    this.unlockLocked = true;
                    showMessageBox("Password changed? Use recovery key instead.", "error", 3000);
                    setTimeout(() => {
                        this.unlockLocked = false;
                        this.failedUnlockAttempts = 0;
                    }, CRYPTO_CONFIG.LOCKOUT_TIME);
                } else {
                    showMessageBox("Password doesn't match. Try recovery key if you reset your password.", "error", 3000);
                }
                this.currentEncryptionKey = null;
                return false;
            }

            this.currentEncryptionKey = derivedKeyForVerification;
            this.secureStoreKey('currentEncryptionKeyHex', this.currentEncryptionKey.toString(CryptoJS.enc.Hex));
            this.failedUnlockAttempts = 0;
            showMessageBox("Dashboard unlocked successfully", "success", 4000);
            return true;

        } catch (error) {
            console.error("Error unlocking dashboard:", error);
            showMessageBox("Error unlocking dashboard: " + error.message, "error", 3000);
            this.currentEncryptionKey = null;
            return false;
        }
    }

    async restoreEncryptionKey() {
        const storedKeyHex = this.secureGetKey('currentEncryptionKeyHex');
        if (storedKeyHex) {
            try {
                this.currentEncryptionKey = CryptoJS.enc.Hex.parse(storedKeyHex);
                
                // Verify the key still works by checking against stored hash
                const user = this.currentUser || this.auth.currentUser;
                if (user) {
                    const playerDoc = await this.db.collection('players').doc(user.uid).get();
                    const data = playerDoc.data();
                    if (data && data.masterPasswordHash && storedKeyHex !== data.masterPasswordHash) {
                        // Key doesn't match - password was likely reset
                        this.secureRemoveKey('currentEncryptionKeyHex');
                        this.currentEncryptionKey = null;
                        return false;
                    }
                }
                
                console.log("Encryption key restored from sessionStorage.");
                return true;
            } catch (e) {
                console.error("Failed to restore encryption key from localStorage:", e);
                this.secureRemoveKey('currentEncryptionKeyHex');
                this.currentEncryptionKey = null;
                return false;
            }
        }
        return false;
    }

    clearSession() {
        this.currentEncryptionKey = null;
        this.secureRemoveKey('currentEncryptionKeyHex');
        clearTimeout(this.sessionExpiryTimer);
    }

    // Secure storage methods
    secureStoreKey(key, value) {
        const sessionKey = CryptoJS.SHA256(navigator.userAgent + window.location.origin).toString();
        const encrypted = CryptoJS.AES.encrypt(value, sessionKey).toString();
        sessionStorage.setItem(key, encrypted);
    }

    secureGetKey(key) {
        const encrypted = sessionStorage.getItem(key);
        if (!encrypted) return null;
        try {
            const sessionKey = CryptoJS.SHA256(navigator.userAgent + window.location.origin).toString();
            const decrypted = CryptoJS.AES.decrypt(encrypted, sessionKey);
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            sessionStorage.removeItem(key);
            return null;
        }
    }

    secureRemoveKey(key) {
        sessionStorage.removeItem(key);
    }

    // Check if account needs recovery key due to password reset
    async checkPasswordResetStatus() {
        const user = this.currentUser || this.auth.currentUser;
        if (!user) return false;
        
        try {
            const playerDoc = await this.db.collection('players').doc(user.uid).get();
            const data = playerDoc.data();
            return data && data.recoveredFromKey;
        } catch (error) {
            console.error('Error checking password reset status:', error);
            return false;
        }
    }
}