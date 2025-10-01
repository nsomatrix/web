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
            this.sessionExpiryTimer = setTimeout(() => {
                console.warn("Session expired due to inactivity. Clearing encryption key.");
                this.currentEncryptionKey = null;
                sessionStorage.removeItem('currentEncryptionKeyHex');
                showMessageBox("Session expired due to inactivity. Please re-enter master password.", 'warning', 3000);
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

        // Get current user from Firebase auth if not set
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

            const derivedKeyForVerification = await deriveKey(masterPassword, data.salt);
            const derivedMasterPasswordHash = derivedKeyForVerification.toString(CryptoJS.enc.Hex);

            if (derivedMasterPasswordHash !== data.masterPasswordHash) {
                this.failedUnlockAttempts++;
                if (this.failedUnlockAttempts >= CRYPTO_CONFIG.MAX_ATTEMPTS) {
                    this.unlockLocked = true;
                    showMessageBox("Incorrect password. Please wait before trying again.", "error", 3000);
                    setTimeout(() => {
                        this.unlockLocked = false;
                        this.failedUnlockAttempts = 0;
                        showMessageBox("You can try again now", "info", 3000);
                    }, CRYPTO_CONFIG.LOCKOUT_TIME);
                } else {
                    showMessageBox("Incorrect master password", "error", 3000);
                }
                this.currentEncryptionKey = null;
                return false;
            }

            this.currentEncryptionKey = derivedKeyForVerification;
            sessionStorage.setItem('currentEncryptionKeyHex', this.currentEncryptionKey.toString(CryptoJS.enc.Hex));
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

    restoreEncryptionKey() {
        const storedKeyHex = sessionStorage.getItem('currentEncryptionKeyHex');
        if (storedKeyHex) {
            try {
                this.currentEncryptionKey = CryptoJS.enc.Hex.parse(storedKeyHex);
                console.log("Encryption key restored from sessionStorage.");
                return true;
            } catch (e) {
                console.error("Failed to restore encryption key from sessionStorage:", e);
                sessionStorage.removeItem('currentEncryptionKeyHex');
                this.currentEncryptionKey = null;
                return false;
            }
        }
        return false;
    }

    clearSession() {
        this.currentEncryptionKey = null;
        sessionStorage.removeItem('currentEncryptionKeyHex');
        clearTimeout(this.sessionExpiryTimer);
    }
}