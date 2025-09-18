import { CRYPTO_CONFIG } from './config.js';
import { deriveKey } from './crypto.js';
import { showMessageBox, openModal, closeModal } from './ui.js';

export class AuthManager {
    constructor(auth, db, translations) {
        this.auth = auth;
        this.db = db;
        this.translations = translations;
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
                showMessageBox("message_box_session_expired_re_enter_master_password", 'warning', 3000, this.translations);
            }, CRYPTO_CONFIG.SESSION_TIMEOUT);
        };

        document.addEventListener('mousemove', startTimer);
        document.addEventListener('keydown', startTimer);
        document.addEventListener('click', startTimer);
        startTimer();
    }

    async unlockDashboard(masterPassword) {
        if (this.unlockLocked) {
            showMessageBox("message_box_too_many_failed_attempts", "error", 3000, this.translations);
            return false;
        }

        if (!masterPassword) {
            showMessageBox("message_box_please_enter_master_password", "error", 3000, this.translations);
            return false;
        }

        // Get current user from Firebase auth if not set
        const user = this.currentUser || this.auth.currentUser;
        if (!user) {
            showMessageBox("message_box_please_login_first", "error", 3000, this.translations);
            return false;
        }

        try {
            const playerDocRef = this.db.collection("players").doc(user.uid);
            const playerDoc = await playerDocRef.get();
            const data = playerDoc.data();

            if (!data || !data.salt || !data.masterPasswordHash) {
                showMessageBox("message_box_no_master_password_set_yet", "info", 3000, this.translations);
                return false;
            }

            const derivedKeyForVerification = await deriveKey(masterPassword, data.salt);
            const derivedMasterPasswordHash = derivedKeyForVerification.toString(CryptoJS.enc.Hex);

            if (derivedMasterPasswordHash !== data.masterPasswordHash) {
                this.failedUnlockAttempts++;
                if (this.failedUnlockAttempts >= CRYPTO_CONFIG.MAX_ATTEMPTS) {
                    this.unlockLocked = true;
                    showMessageBox("message_box_incorrect_password_wait", "error", 3000, this.translations);
                    setTimeout(() => {
                        this.unlockLocked = false;
                        this.failedUnlockAttempts = 0;
                        showMessageBox("message_box_try_again", "info", 3000, this.translations);
                    }, CRYPTO_CONFIG.LOCKOUT_TIME);
                } else {
                    showMessageBox("message_box_incorrect_master_password", "error", 3000, this.translations);
                }
                this.currentEncryptionKey = null;
                return false;
            }

            this.currentEncryptionKey = derivedKeyForVerification;
            sessionStorage.setItem('currentEncryptionKeyHex', this.currentEncryptionKey.toString(CryptoJS.enc.Hex));
            this.failedUnlockAttempts = 0;
            showMessageBox("message_box_dashboard_unlocked", "success", 4000, this.translations);
            return true;

        } catch (error) {
            console.error("Error unlocking dashboard:", error);
            showMessageBox("error_unlocking_dashboard_error" + error.message, "error", 3000, this.translations);
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