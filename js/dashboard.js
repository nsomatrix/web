// Unified Dashboard JavaScript - Optimized
import { getFirebaseConfig } from './modules/config.js';
import { AuthManager } from './modules/auth.js';
import { FileManager } from './modules/files.js';
import { NotesManager } from './modules/notes.js';
import { PasswordManager } from './modules/passwords.js';
import { FriendsManager } from './modules/friends.js';
import { MessagingManager } from './modules/messaging.js';
import { SocialManager } from './modules/social.js';
import { ShieldManager } from './modules/shield.js';
import { showMessageBox, openModal, closeModal } from './modules/ui.js';
import { encryptData, decryptData } from './modules/crypto.js';

// Global modal functions
window.closeModal = closeModal;
window.openModal = openModal;
window.showMessageBox = showMessageBox;

// Initialize Firebase
let auth, db;
getFirebaseConfig().then(firebaseConfig => {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Make Firebase globally available for debugging and other scripts
    window.firebaseAuth = auth;
    window.firebaseDb = db;

    initializeManagers();
    setupAuthStateListener();
});

// Global variables
let allAvatars = [];
let currentAvatarIndex = 0;
let authManager, fileManager, notesManager, passwordManager, friendsManager, messagingManager, socialManager, shieldManager;

// Desktop Dashboard Enhancement
class DesktopDashboard {
    constructor() {
        this.setupResponsive();
    }

    setupResponsive() {
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    handleResize() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.style.display = window.innerWidth <= 768 ? 'none' : 'flex';
        }
    }
}

function setupAuthStateListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (authManager) {
                authManager.currentUser = user;
            }

            // Don't setup dashboard if recovery key is being shown
            if (sessionStorage.getItem('showingRecoveryKey')) {
                console.log('Recovery key modal is open, delaying dashboard setup');
                return;
            }

            setTimeout(() => {
                setupDashboard(user);
            }, 2000);
        } else {
            console.log("No user logged in. Redirecting to login.html.");
            document.getElementById('setup-section').style.display = 'none';
            document.getElementById('main-dashboard').style.display = 'none';
            authManager?.clearSession();

            // Clear 2FA session data on sign out
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('2fa_verified_')) {
                    sessionStorage.removeItem(key);
                }
            });

            if (window.location.pathname !== '/login.html') {
                window.location.href = "login.html";
            }
        }
    });
}

// Session validation - check if current session still exists
let sessionValidationPaused = false;

async function validateSession() {
    if (sessionValidationPaused || !authManager.currentUser || !shieldManager.currentSessionId) return true;

    try {
        const sessionDoc = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('sessions').doc(shieldManager.currentSessionId).get();

        if (!sessionDoc.exists) {
            // Check if this is a new account (no sessions created yet)
            const allSessions = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('sessions').get();

            if (allSessions.empty) {
                // New account, no sessions exist yet - this is normal
                console.log('New account detected, no sessions exist yet');
                return true;
            }

            console.log('Session was revoked, signing out');
            // Clear the revoked session ID
            shieldManager.currentSessionId = null;
            sessionStorage.removeItem('nsomatrix_session_id');

            // Sign out immediately - don't create new session
            showMessageBox('Session revoked from another device. Signing out...', 'warning', 2000);
            setTimeout(() => {
                auth.signOut();
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session validation error:', error);
        return true; // Don't sign out on error
    }
}

// Check session every 30 seconds
setInterval(validateSession, 30000);

// Initialize managers
function initializeManagers() {
    authManager = new AuthManager(auth, db);
    fileManager = new FileManager(authManager);
    notesManager = new NotesManager(authManager, db);
    passwordManager = new PasswordManager(authManager, db);
    friendsManager = new FriendsManager(authManager, db);
    messagingManager = new MessagingManager(authManager, db);
    socialManager = new SocialManager(authManager, db);
    shieldManager = new ShieldManager(authManager, db);


    // Make managers globally available
    window.authManager = authManager;
    window.friendsManager = friendsManager;
    window.messagingManager = messagingManager;
    window.socialManager = socialManager;
    window.shieldManager = shieldManager;
}

// 2FA enforcement functions
async function check2FARequired(user) {
    try {
        const doc = await db.collection('players').doc(user.uid).get();
        const data = doc.data() || {};
        // Check if either authenticator OR email 2FA is enabled
        return (data.authenticatorEnabled === true && data.totpSecret) || data.emailTwoFactorEnabled === true;
    } catch (error) {
        console.error('Error checking 2FA status:', error);
        return false;
    }
}

async function verify2FA(user) {
    return new Promise(async (resolve) => {
        // Pause session validation during 2FA
        sessionValidationPaused = true;

        // Check what 2FA methods are enabled
        const doc = await db.collection('players').doc(user.uid).get();
        const data = doc.data() || {};
        const hasAuthenticator = data.authenticatorEnabled === true && data.totpSecret;
        const hasEmailTwoFactor = data.emailTwoFactorEnabled === true;

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10002;display:flex;align-items:center;justify-content:center;';

        let methodButtons = '';
        if (hasAuthenticator) {
            methodButtons += `
                <button id="useAuthenticatorBtn" style="background:#007bff;color:white;border:none;padding:15px 30px;border-radius:8px;cursor:pointer;margin:10px;width:100%;font-weight:600;">
                    📱 Use Authenticator App
                </button>`;
        }
        if (hasEmailTwoFactor) {
            methodButtons += `
                <button id="useEmailCodeBtn" style="background:#ffc107;color:white;border:none;padding:15px 30px;border-radius:8px;cursor:pointer;margin:10px;width:100%;font-weight:600;">
                    ✉️ Send Email Code
                </button>`;
        }

        // If only one method is enabled, show it directly
        const showMethodSelection = hasAuthenticator && hasEmailTwoFactor;

        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:40px;border-radius:16px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#00d4ff;margin-bottom:30px;">🔐 Two-Factor Authentication Required</h3>
                
                <div id="authMethodSelection" style="display:${showMethodSelection ? 'block' : 'none'};">
                    <p style="color:#ccc;margin-bottom:30px;">Choose your verification method:</p>
                    ${methodButtons}
                </div>
                
                <div id="authCodeSection" style="display:${showMethodSelection ? 'none' : 'block'};">
                    <p id="codePrompt" style="color:#ccc;margin-bottom:20px;">${hasAuthenticator && !hasEmailTwoFactor ? 'Enter your authenticator app code:' : 'Enter the code sent to your email:'}</p>
                    <input type="tel" id="authCodeInput" placeholder="000000" style="background:#2d2d2d;color:white;border:1px solid #555;padding:12px;width:150px;text-align:center;border-radius:8px;font-size:18px;letter-spacing:2px;" maxlength="6" inputmode="numeric" pattern="[0-9]*" />
                    <br><br>
                    <button id="verifyCodeBtn" style="background:#28a745;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;-webkit-tap-highlight-color:transparent;">Verify Code</button>
                    ${showMethodSelection ? '<button id="backBtn" style="background:#6c757d;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;-webkit-tap-highlight-color:transparent;">Back</button>' : ''}
                </div>
                
                <button id="signOutBtn" style="background:#dc3545;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin-top:20px;">Sign Out</button>
            </div>
        `;

        document.body.appendChild(modal);

        const methodSelection = document.getElementById('authMethodSelection');
        const codeSection = document.getElementById('authCodeSection');
        const codePrompt = document.getElementById('codePrompt');
        const codeInput = document.getElementById('authCodeInput');
        const verifyBtn = document.getElementById('verifyCodeBtn');
        const backBtn = document.getElementById('backBtn');
        const signOutBtn = document.getElementById('signOutBtn');

        let currentMethod = null;

        // If only one method enabled, set it automatically
        if (hasAuthenticator && !hasEmailTwoFactor) {
            currentMethod = 'authenticator';
        } else if (!hasAuthenticator && hasEmailTwoFactor) {
            currentMethod = 'email';
            // Auto-send email code
            try {
                await sendEmailCode(user.email);
                codePrompt.textContent = 'Enter the code sent to your email:';
            } catch (error) {
                codePrompt.textContent = 'Failed to send email code. Please try again.';
            }
        }

        // Authenticator app method
        if (hasAuthenticator) {
            document.getElementById('useAuthenticatorBtn')?.addEventListener('click', () => {
                currentMethod = 'authenticator';
                methodSelection.style.display = 'none';
                codeSection.style.display = 'block';
                codePrompt.textContent = 'Enter your authenticator app code:';
                codeInput.focus();
            });
        }

        // Email code method
        if (hasEmailTwoFactor) {
            document.getElementById('useEmailCodeBtn')?.addEventListener('click', async () => {
                currentMethod = 'email';
                methodSelection.style.display = 'none';
                codeSection.style.display = 'block';
                codePrompt.textContent = 'Sending email code...';

                try {
                    await sendEmailCode(user.email);
                    codePrompt.textContent = 'Enter the code sent to your email:';
                    codeInput.focus();
                } catch (error) {
                    codePrompt.textContent = 'Failed to send email. Try again.';
                    setTimeout(() => {
                        backBtn?.click();
                    }, 2000);
                }
            });
        }

        // Back button (only if multiple methods)
        if (backBtn) {
            backBtn.onclick = () => {
                methodSelection.style.display = 'block';
                codeSection.style.display = 'none';
                codeInput.value = '';
                currentMethod = null;
            };
        }

        // Verify code
        const verify = async () => {
            const code = codeInput.value.trim();
            console.log('Verifying code:', code, 'Method:', currentMethod);

            if (!/^\d{6}$/.test(code)) {
                console.log('Invalid code format');
                showMessageBox('Please enter a valid 6-digit code', 'error', 3000);
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';

            try {
                let isValid = false;

                if (currentMethod === 'authenticator') {
                    console.log('Verifying with authenticator');
                    isValid = await verifyTOTPCode(data.totpSecret, code);
                    console.log('TOTP verification result:', isValid);
                } else if (currentMethod === 'email') {
                    console.log('Verifying with email');
                    isValid = await verifyEmailCode(user.uid, code);
                    console.log('Email verification result:', isValid);
                }

                console.log('Final verification result:', isValid);

                if (isValid) {
                    console.log('Verification successful, resolving');
                    sessionValidationPaused = false; // Resume session validation
                    modal.remove();
                    resolve(true);
                } else {
                    console.log('Verification failed');
                    showMessageBox('Invalid code. Please try again.', 'error', 3000);
                    setTimeout(() => {
                        verifyBtn.disabled = false;
                        verifyBtn.textContent = 'Verify Code';
                        codeInput.select();
                    }, 100);
                }
            } catch (error) {
                console.error('2FA verification error:', error);
                showMessageBox('Verification failed: ' + error.message, 'error', 3000);
                setTimeout(() => {
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify Code';
                }, 100);
            }
        };

        // Use touchend for mobile compatibility
        verifyBtn.addEventListener('click', verify);
        verifyBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            verify();
        });

        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                verify();
            }
        });

        // Mobile-specific input handling
        codeInput.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            // Auto-verify when 6 digits entered on mobile
            if (e.target.value.length === 6 && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                setTimeout(() => verify(), 500);
            }
        });

        signOutBtn.onclick = () => {
            sessionValidationPaused = false; // Resume session validation
            modal.remove();
            resolve(false);
        };

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                sessionValidationPaused = false; // Resume session validation
                modal.remove();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.removeEventListener('keydown', handleEscape);
                sessionValidationPaused = false; // Resume session validation
                modal.remove();
                resolve(false);
            }
        };

        // Focus input if code section is visible
        if (codeSection.style.display !== 'none') {
            codeInput.focus();
        }
    });
}

async function verifyTOTPCode(secret, token) {
    try {
        if (!secret || !token || token.length !== 6) {
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000 / 30);

        // Check current time and ±3 windows for mobile compatibility
        for (let drift = -3; drift <= 3; drift++) {
            const timeWindow = currentTime + drift;
            const expectedToken = await generateTOTP(secret, timeWindow);

            if (expectedToken === token) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
}

async function generateTOTP(secret, timeWindow) {
    try {
        const key = base32ToBytes(secret);
        if (!key || key.length === 0) {
            throw new Error('Invalid secret key');
        }

        // Create time buffer
        const timeBytes = new Uint8Array(8);
        const timeView = new DataView(timeBytes.buffer);
        timeView.setUint32(4, timeWindow, false);

        // Use CryptoJS for mobile compatibility
        const keyWordArray = CryptoJS.lib.WordArray.create(key);
        const timeWordArray = CryptoJS.lib.WordArray.create(timeBytes);

        const hmac = CryptoJS.HmacSHA1(timeWordArray, keyWordArray);
        const hmacBytes = new Uint8Array(hmac.sigBytes);

        // Convert WordArray to Uint8Array
        for (let i = 0; i < hmac.sigBytes; i++) {
            hmacBytes[i] = (hmac.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
        const code = ((hmacBytes[offset] & 0x7f) << 24) |
            ((hmacBytes[offset + 1] & 0xff) << 16) |
            ((hmacBytes[offset + 2] & 0xff) << 8) |
            (hmacBytes[offset + 3] & 0xff);

        const result = (code % 1000000).toString().padStart(6, '0');
        return result;
    } catch (error) {
        console.error('TOTP generation error:', error);
        throw error;
    }
}

function base32ToBytes(base32) {
    try {
        if (!base32 || typeof base32 !== 'string') {
            throw new Error('Invalid base32 input');
        }

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');

        if (cleanBase32.length === 0) {
            throw new Error('Empty base32 string after cleaning');
        }

        let bits = '';
        for (let char of cleanBase32) {
            const index = alphabet.indexOf(char);
            if (index === -1) continue;
            bits += index.toString(2).padStart(5, '0');
        }

        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.substring(i, i + 8);
            if (byte.length === 8) {
                bytes.push(parseInt(byte, 2));
            }
        }

        return new Uint8Array(bytes);
    } catch (error) {
        console.error('Base32 decode error:', error);
        throw error;
    }
}

async function sendEmailCode(email) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await db.collection('emailVerifications').doc(auth.currentUser.uid).set({
        code: verificationCode,
        expiry: expiry,
        used: false,
        email: email
    });

    // Send email via EmailJS proxy
    const response = await fetch('https://emailjs-proxy.nsomtx.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, code: verificationCode })
    });

    if (!response.ok) {
        throw new Error('Failed to send email');
    }
}

async function verifyEmailCode(uid, code) {
    try {
        const doc = await db.collection('emailVerifications').doc(uid).get();
        if (!doc.exists) return false;

        const data = doc.data();
        if (data.used || Date.now() > data.expiry) return false;
        if (data.code !== code) return false;

        // Mark as used
        await doc.ref.update({ used: true });
        return true;
    } catch (error) {
        return false;
    }
}

// Avatar functions
async function loadAvatars() {
    try {
        const response = await fetch('avatars/avatars.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allAvatars = await response.json();
        if (allAvatars.length > 0) {
            document.getElementById('currentAvatarDisplay').src = `avatars/${allAvatars[currentAvatarIndex]}`;
        }
    } catch (error) {
        console.error("Error loading avatars:", error);
        showMessageBox("Could not load avatars", "error", 3000);
    }
}

function updateAvatarDisplay() {
    if (allAvatars.length > 0) {
        document.getElementById('currentAvatarDisplay').src = `avatars/${allAvatars[currentAvatarIndex]}`;
    }
}

// Profile management
async function saveProfile(user) {
    const username = document.getElementById('usernameInput').value.trim();
    const selectedAvatar = allAvatars[currentAvatarIndex];

    if (!username || !selectedAvatar) {
        showMessageBox("Please enter username and select avatar", "error", 3000);
        return;
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";

    try {
        const playerDocRef = db.collection('players').doc(user.uid);
        const playerDoc = await playerDocRef.get();
        const data = playerDoc.exists ? playerDoc.data() : {};

        await db.collection('players').doc(user.uid).set({
            username: username,
            avatar: selectedAvatar,
            usernameTag: username.toLowerCase(),
            level: data.level || 1
        }, { merge: true });

        showMessageBox("Profile saved successfully", "success", 3000);
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        document.getElementById('dashboard-username').textContent = username;
        document.getElementById('user-avatar').src = `avatars/${selectedAvatar}`;
        setupUsernameTag(username, username);

        setupNotificationHandlers();
        setupOnlinePresence();
        setupNotificationCounters();

    } catch (error) {
        console.error("Error saving profile:", error);
        showMessageBox("Failed to save profile: " + error.message, "error", 3000);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Profile";
    }
}

// Dashboard setup
async function setupDashboard(user) {
    authManager.currentUser = user;

    // Check if 2FA is required and verify it first
    const requires2FA = await check2FARequired(user);
    if (requires2FA) {
        // Check if 2FA was already verified in this session
        const sessionData = sessionStorage.getItem('2fa_verified_' + user.uid);
        const currentTime = Date.now();

        let skipTwoFA = false;
        if (sessionData) {
            try {
                const decrypted = CryptoJS.AES.decrypt(sessionData, CryptoJS.SHA256(navigator.userAgent + user.uid).toString());
                const data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
                // If verified within last 30 minutes and UIDs match, skip 2FA
                if (data.verified && data.uid === user.uid && (currentTime - data.time) < 30 * 60 * 1000) {
                    skipTwoFA = true;
                }
            } catch (e) {
                sessionStorage.removeItem('2fa_verified_' + user.uid);
            }
        }

        if (skipTwoFA) {
            console.log('2FA already verified in this session');
        } else {
            const verified = await verify2FA(user);
            if (!verified) {
                showMessageBox('2FA verification failed. Signing out.', 'error', 3000);
                setTimeout(() => {
                    auth.signOut();
                    window.location.href = 'login.html';
                }, 3000);
                return;
            } else {
                // Store 2FA verification in session with encryption
                const sessionData = CryptoJS.AES.encrypt(JSON.stringify({
                    verified: true,
                    time: currentTime,
                    uid: user.uid
                }), CryptoJS.SHA256(navigator.userAgent + user.uid).toString()).toString();
                sessionStorage.setItem('2fa_verified_' + user.uid, sessionData);
            }
        }
    }

    const playerDocRef = db.collection('players').doc(user.uid);

    try {
        const doc = await playerDocRef.get();
        const data = doc.exists ? doc.data() : {};

        const hasUsername = !!data.username;
        const hasAvatar = !!data.avatar;
        const hasMasterPassword = !!data.hasMasterPassword;
        const lastLoginTimestamp = data.lastLogin;

        const keyRestored = await authManager.restoreEncryptionKey();

        // Check if account was recovered from password reset
        const wasPasswordReset = await authManager.checkPasswordResetStatus();

        // If key restoration failed or password was reset, show recovery key prompt
        if ((!keyRestored && data.encryptedMasterKey) || wasPasswordReset) {
            setTimeout(() => {
                if (wasPasswordReset) {
                    showMessageBox('Password was reset. Please use your recovery key to access encrypted data.', 'warning', 5000);
                    // Auto-open recovery key modal for password reset accounts
                    setTimeout(() => {
                        openModal(document.getElementById('recoveryKeyModal'));
                    }, 1000);
                } else {
                    showMessageBox('Session expired. Please re-enter master password or use recovery key.', 'warning', 5000);
                }
            }, 2000);
        }

        if (!hasUsername || !hasAvatar) {
            if (allAvatars.length === 0) await loadAvatars();

            document.getElementById('setup-section').style.display = 'block';
            document.getElementById('main-dashboard').style.display = 'none';
            closeModal(document.getElementById('masterPasswordPromptModal'));

            // Initialize the new setup system
            if (window.initGameSetup) {
                window.initGameSetup();
            }

            return;
        }

        document.getElementById('dashboard-username').textContent = data.username;
        document.getElementById('user-avatar').src = `avatars/${data.avatar}`;
        setupUsernameTag(data.usernameTag, data.username);
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        closeModal(document.getElementById('masterPasswordPromptModal'));



        setupNotificationHandlers();
        setupOnlinePresence();
        setupNotificationCounters();



        // Initialize Shield features
        if (shieldManager) {
            await shieldManager.createSession();
            await shieldManager.recordLogin();
        }

        // Update last login
        const lastLoginDisplay = document.getElementById('lastLoginDisplay');
        if (lastLoginDisplay) {
            if (lastLoginTimestamp) {
                const date = lastLoginTimestamp.toDate();
                lastLoginDisplay.innerHTML = `Last Login: ${date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
            } else {
                lastLoginDisplay.innerHTML = `Last Login: Never`;
            }
            await playerDocRef.set({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

    } catch (error) {
        console.error("Error setting up dashboard:", error);
        showMessageBox("Failed to load dashboard: " + error.message, "error", 3000);
    }
}

// Event Listeners
function setupEventListeners() {
    // Avatar navigation
    const prevAvatarBtn = document.getElementById('prevAvatarBtn');
    const nextAvatarBtn = document.getElementById('nextAvatarBtn');

    if (prevAvatarBtn) {
        prevAvatarBtn.onclick = () => {
            currentAvatarIndex = (currentAvatarIndex - 1 + allAvatars.length) % allAvatars.length;
            updateAvatarDisplay();
        };
    }

    if (nextAvatarBtn) {
        nextAvatarBtn.onclick = () => {
            currentAvatarIndex = (currentAvatarIndex + 1) % allAvatars.length;
            updateAvatarDisplay();
        };
    }

    // Profile save
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            if (authManager.currentUser) {
                saveProfile(authManager.currentUser);
            } else {
                showMessageBox("Please login first", "error", 3000);
            }
        };
    }

    // Master password unlock/setup
    const unlockDashboardBtn = document.getElementById('unlockDashboardBtn');
    if (unlockDashboardBtn) {
        unlockDashboardBtn.onclick = async () => {
            const masterPassword = document.getElementById('masterPasswordUnlockInput').value.trim();
            const confirmPassword = document.getElementById('confirmMasterPasswordInput').value.trim();
            const isSetupMode = document.getElementById('confirmMasterPasswordInput').style.display !== 'none';

            unlockDashboardBtn.disabled = true;
            unlockDashboardBtn.textContent = isSetupMode ? "Setting up..." : "Unlocking...";

            let success = false;
            if (isSetupMode) {
                success = await setupMasterPassword(masterPassword, confirmPassword);
            } else {
                success = await authManager.unlockDashboard(masterPassword);
            }

            if (success) {
                const masterPasswordPromptModal = document.getElementById('masterPasswordPromptModal');
                closeModal(masterPasswordPromptModal);
                document.getElementById('masterPasswordUnlockInput').value = '';
                document.getElementById('confirmMasterPasswordInput').value = '';

                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');

                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }

            unlockDashboardBtn.disabled = false;
            unlockDashboardBtn.textContent = isSetupMode ? "Set Master Password" : "Unlock Dashboard";
        };
    }

    // Forgot master password handler
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.onclick = () => {
            closeModal(document.getElementById('masterPasswordPromptModal'));
            showMessageBox('To reset your password, please log out and use the "Forgot Password" link on the sign-in page.', 'info', 5000);
        };
    }

    const recoverBtn = document.getElementById('recoverBtn');
    if (recoverBtn) {
        recoverBtn.onclick = async () => {
            const recoveryKey = document.getElementById('recoveryKeyInput').value.trim();
            recoverBtn.disabled = true;
            recoverBtn.textContent = 'Recovering...';

            // Mark recovery in progress
            sessionStorage.setItem('recoveryInProgress', 'true');

            if (await recoverWithKey(recoveryKey)) {
                closeModal(document.getElementById('recoveryKeyModal'));
                document.getElementById('recoveryKeyInput').value = '';

                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');

                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }

            // Clean up recovery flag
            sessionStorage.removeItem('recoveryInProgress');
            recoverBtn.disabled = false;
            recoverBtn.textContent = 'Recover Access';
        };
    }

    const lostKeyBtn = document.getElementById('lostKeyBtn');
    if (lostKeyBtn) {
        lostKeyBtn.onclick = () => {
            showMessageBox('Lost your recovery key? Your only option is to delete your account and start over due to our zero-knowledge encryption model. We cannot recover your data without the key. Go to Dashboard → Delete Account to proceed.', 'error', 8000);
        };
    }

    // Password manager toggle
    setTimeout(() => {
        const togglePmPassword = document.getElementById('togglePmPassword');
        if (togglePmPassword) {
            togglePmPassword.addEventListener('click', () => {
                const pmPasswordInput = document.getElementById('pmPassword');
                const type = pmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                pmPasswordInput.setAttribute('type', type);
                const eyeIcon = togglePmPassword.querySelector('i');
                eyeIcon.classList.toggle('fa-eye');
                eyeIcon.classList.toggle('fa-eye-slash');
            });
        }
    }, 1000);

    const syncPasswordBtn = document.getElementById('syncPasswordBtn');
    if (syncPasswordBtn) {
        syncPasswordBtn.onclick = async () => {
            const currentPassword = document.getElementById('syncPasswordInput').value.trim();
            syncPasswordBtn.disabled = true;
            syncPasswordBtn.textContent = 'Syncing...';

            if (await syncWithCurrentPassword(currentPassword)) {
                document.getElementById('syncPasswordSection').style.display = 'none';
                closeModal(document.getElementById('masterPasswordPromptModal'));

                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');

                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }

            syncPasswordBtn.disabled = false;
            syncPasswordBtn.textContent = 'Sync Password';
        };
    }

    const toggleSyncPassword = document.getElementById('toggleSyncPassword');
    if (toggleSyncPassword) {
        toggleSyncPassword.addEventListener('click', () => {
            const syncPasswordInput = document.getElementById('syncPasswordInput');
            const type = syncPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            syncPasswordInput.setAttribute('type', type);
            const eyeIcon = toggleSyncPassword.querySelector('i');
            eyeIcon.classList.toggle('fa-eye');
            eyeIcon.classList.toggle('fa-eye-slash');
        });
    }

    const cancelRecoveryBtn = document.getElementById('cancelRecoveryBtn');
    if (cancelRecoveryBtn) {
        cancelRecoveryBtn.onclick = () => {
            document.getElementById('recoverySection').style.display = 'none';
            document.getElementById('recoveryKeyInput').value = '';
        };
    }

    // Enter key for master password
    const masterPasswordUnlockInput = document.getElementById('masterPasswordUnlockInput');
    if (masterPasswordUnlockInput) {
        masterPasswordUnlockInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                unlockDashboardBtn.click();
            }
        });
    }

    // Feature buttons
    setupFeatureButtons();
    setupModalHandlers();
    setupDeleteHandlers();
    setupSearchAndMessaging();
}

function setupFeatureButtons() {
    const notesBtn = document.getElementById('notesBtn');
    if (notesBtn) {
        let notesClickTimeout;
        notesBtn.onclick = async () => {
            if (notesClickTimeout) return;
            notesClickTimeout = setTimeout(() => { notesClickTimeout = null; }, 500);

            if (!authManager.currentEncryptionKey) {
                showMasterPasswordPrompt('notesModal');
                return;
            }
            openModal(document.getElementById('notesModal'));
            notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
        };
    }

    const passwordManagerBtn = document.getElementById('passwordManagerBtn');
    if (passwordManagerBtn) {
        let pmClickTimeout;
        passwordManagerBtn.onclick = async () => {
            if (pmClickTimeout) return;
            pmClickTimeout = setTimeout(() => { pmClickTimeout = null; }, 500);

            if (!authManager.currentEncryptionKey) {
                showMasterPasswordPrompt('passwordManagerModal');
                return;
            }
            openModal(document.getElementById('passwordManagerModal'));
            passwordManager.loadPasswords(document.getElementById('pmEntryList'));
        };
    }



    const serverBtn = document.getElementById('serverBtn');
    if (serverBtn) {
        serverBtn.onclick = () => {
            window.open("https://support.teamobi.com/login-game-3.html", "_blank");
        };
    }

    const friendsBtn = document.getElementById('friendsBtn');
    if (friendsBtn) {
        let friendsClickTimeout;
        friendsBtn.onclick = () => {
            if (friendsClickTimeout) return;
            friendsClickTimeout = setTimeout(() => {
                friendsClickTimeout = null;
            }, 500);

            openModal(document.getElementById('friendsModal'));
            friendsManager.loadFriendsList();
        };
    }

    const securityBtn = document.getElementById('securityBtn');
    if (securityBtn) {
        let securityClickTimeout;
        securityBtn.onclick = async () => {
            if (securityClickTimeout) return;
            securityClickTimeout = setTimeout(() => { securityClickTimeout = null; }, 500);

            openModal(document.getElementById('shieldModal'));
            await shieldManager.loadShieldData();
        };
    }
}

function setupModalHandlers() {
    // Notes functionality
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    if (saveNoteBtn) {
        saveNoteBtn.onclick = async () => {
            const noteText = document.getElementById('noteInput').value.trim();
            const success = await notesManager.saveNote(noteText);
            if (success) {
                document.getElementById('noteInput').value = '';
            }
        };
    }

    // Password manager functionality
    const savePmEntryBtn = document.getElementById('savePmEntryBtn');
    if (savePmEntryBtn) {
        savePmEntryBtn.onclick = async () => {
            const serviceName = document.getElementById('pmServiceName').value.trim();
            const pmUsername = document.getElementById('pmUsername').value.trim();
            const pmPassword = document.getElementById('pmPassword').value.trim();

            const success = await passwordManager.savePassword(serviceName, pmUsername, pmPassword);
            if (success) {
                document.getElementById('pmServiceName').value = '';
                document.getElementById('pmUsername').value = '';
                document.getElementById('pmPassword').value = '';
            }
        };
    }



    // Modal close buttons
    document.querySelectorAll('.close-button').forEach(button => {
        const handleClose = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modalId = e.target.dataset.modal;
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                closeModal(modalElement);
            } else {
                const modal = e.target.closest('.modal');
                if (modal) closeModal(modal);
            }
        };

        button.addEventListener('click', handleClose);
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleClose(e);
        });
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
            openModals.forEach(modal => closeModal(modal));
        }
    });
}

function setupDeleteHandlers() {
    // Delete account
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.onclick = () => {
            openModal(document.getElementById('deleteAccountConfirmModal'));
        };
    }

    const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
    if (confirmDeleteAccountBtn) {
        confirmDeleteAccountBtn.onclick = async () => {
            closeModal(document.getElementById('deleteAccountConfirmModal'));
            showMessageBox("Initiating complete account deletion...", 'info', 0);

            if (!authManager.currentUser) {
                showMessageBox("Please login first", "error", 3000);
                return;
            }

            try {
                const uid = authManager.currentUser.uid;
                const deletePromises = [];

                // Delete all subcollections
                const collections = ['notes', 'passwords', 'friends', 'friendRequests', 'notifications', 'sessions', 'loginHistory', 'securityEvents', 'backupCodes'];
                for (const collectionName of collections) {
                    const snapshot = await db.collection('players').doc(uid).collection(collectionName).get();
                    snapshot.forEach(doc => {
                        deletePromises.push(doc.ref.delete());
                    });
                }

                // Delete messages where user is participant
                const messagesSnapshot = await db.collection('messages')
                    .where('participants', 'array-contains', uid).get();
                messagesSnapshot.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });

                // Delete email verifications
                deletePromises.push(db.collection('emailVerifications').doc(uid).delete());

                // Delete presence
                deletePromises.push(db.collection('presence').doc(uid).delete());

                // Delete typing indicators
                const typingSnapshot = await db.collection('typing')
                    .where(firebase.firestore.FieldPath.documentId(), '>=', uid)
                    .where(firebase.firestore.FieldPath.documentId(), '<', uid + '\uf8ff').get();
                typingSnapshot.forEach(doc => {
                    if (doc.id.includes(uid)) {
                        deletePromises.push(doc.ref.delete());
                    }
                });

                // Remove user from group chats
                const groupChatsSnapshot = await db.collection('groupChats')
                    .where('members', 'array-contains', uid).get();
                groupChatsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const updatedMembers = data.members.filter(member => member !== uid);
                    const updatedAdmins = (data.admins || []).filter(admin => admin !== uid);

                    if (updatedMembers.length === 0) {
                        // Delete group if no members left
                        deletePromises.push(doc.ref.delete());
                    } else {
                        // Remove user from group
                        deletePromises.push(doc.ref.update({
                            members: updatedMembers,
                            admins: updatedAdmins
                        }));
                    }
                });

                // Execute all deletions
                await Promise.all(deletePromises);

                // Delete player document
                await db.collection('players').doc(uid).delete();

                // Delete Firebase user account
                await authManager.currentUser.delete();

                showMessageBox("All account data deleted successfully", "success", 3000);
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 3000);

            } catch (error) {
                console.error("Error during account deletion:", error);
                showMessageBox("Failed to delete account: " + error.message, "error", 5000);

                if (error.code === 'auth/requires-recent-login') {
                    showMessageBox("Account deletion requires recent login. Please log in again.", "warning", 5000);
                    setTimeout(() => {
                        auth.signOut().then(() => {
                            window.location.href = "login.html";
                        });
                    }, 3000);
                }
            }
        };
    }

    // Note and password deletion confirmations

    document.getElementById('confirmDeleteNoteBtn').onclick = async () => {
        closeModal(document.getElementById('deleteNoteConfirmModal'));
        if (notesManager.noteToDeleteId) {
            await notesManager.deleteNote(notesManager.noteToDeleteId);
            notesManager.noteToDeleteId = null;
        }
    };

    document.getElementById('confirmDeletePmEntryBtn').onclick = async () => {
        closeModal(document.getElementById('deletePmEntryConfirmModal'));
        if (passwordManager.pmEntryToDeleteId) {
            await passwordManager.deletePassword(passwordManager.pmEntryToDeleteId);
            passwordManager.pmEntryToDeleteId = null;
        }
    };

    // Unfriend confirmation handlers
    const confirmUnfriendBtn = document.getElementById('confirmUnfriendBtn');
    if (confirmUnfriendBtn) {
        confirmUnfriendBtn.onclick = () => friendsManager.confirmRemoveFriend();
    }

    const cancelUnfriendBtn = document.getElementById('cancelUnfriendBtn');
    if (cancelUnfriendBtn) {
        cancelUnfriendBtn.onclick = () => {
            friendsManager.friendToRemove = null;
            closeModal(document.getElementById('unfriendConfirmModal'));
        };
    }

    // Cancel buttons
    ['cancelDeleteNoteBtn', 'cancelDeletePmEntryBtn', 'cancelDeleteAccountBtn'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = () => {
                const modalId = btnId.replace('cancelDelete', 'delete').replace('Btn', 'ConfirmModal');
                closeModal(document.getElementById(modalId));
                showMessageBox("Cancelled!", "info", 2000);
            };
        }
    });
}

function setupSearchAndMessaging() {
    // Search functionality
    const searchIcon = document.getElementById('searchIcon');
    const userSearch = document.getElementById('userSearch');

    if (searchIcon) {
        searchIcon.onclick = () => {
            socialManager.performUserSearch();
        };
    }

    if (userSearch) {
        userSearch.onkeydown = (e) => {
            if (e.key === 'Enter') {
                socialManager.performUserSearch();
            }
        };
    }

    // Enhanced message functionality
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.onclick = (e) => {
            e.preventDefault();
            if (!document.getElementById('messageInput').disabled) {
                messagingManager.sendMessage();
            }
        };
    }

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !messageInput.disabled) {
                e.preventDefault();
                messagingManager.sendMessage();
            }
        };

        messageInput.oninput = () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            messagingManager.handleTyping(messageInput);
        };

        messageInput.onfocus = () => {
            setTimeout(() => {
                const messagesList = document.getElementById('messagesList');
                messagesList.scrollTop = messagesList.scrollHeight;
            }, 300);
        };

        messageInput.onblur = () => {
            messagingManager.stopTyping();
        };
    }
}





// Username tag functionality
function setupUsernameTag(usernameTag, displayName) {
    const usernameTagElement = document.getElementById('username-tag');

    if (usernameTag) {
        usernameTagElement.textContent = `@${usernameTag}`;
        usernameTagElement.classList.remove('editable');
    } else {
        usernameTagElement.textContent = 'Set username';
        usernameTagElement.classList.add('editable');

        usernameTagElement.onclick = () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'username-input';
            input.placeholder = 'Enter username';
            input.maxLength = 20;

            usernameTagElement.innerHTML = '';
            usernameTagElement.appendChild(input);
            input.focus();

            const saveUsername = async () => {
                const newUsername = input.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                if (newUsername && authManager.currentUser) {
                    try {
                        await db.collection('players').doc(authManager.currentUser.uid).update({
                            usernameTag: newUsername.toLowerCase()
                        });
                        usernameTagElement.textContent = `@${newUsername}`;
                        usernameTagElement.classList.remove('editable');
                        usernameTagElement.onclick = null;
                    } catch (error) {
                        console.error('Error saving username:', error);
                        usernameTagElement.textContent = 'Set username';
                    }
                } else {
                    usernameTagElement.textContent = 'Set username';
                }
            };

            input.onblur = saveUsername;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') saveUsername();
            };
        };
    }
}



// Global functions for backward compatibility
window.addFriend = (friendId, friendUsername) => socialManager.addFriend(friendId, friendUsername);
window.acceptFriendRequest = (fromUserId, fromUsername) => socialManager.acceptFriendRequest(fromUserId, fromUsername);
window.rejectFriendRequest = (fromUserId) => socialManager.rejectFriendRequest(fromUserId);
window.markAsRead = (notificationId) => socialManager.markAsRead(notificationId);
window.removeFriend = (friendId) => friendsManager.removeFriend(friendId);
window.sendMessage = (friendId) => messagingManager.openChat(friendId);
window.openGroupChat = (groupId) => messagingManager.openGroupChat(groupId);





// Global message menu functions for backward compatibility
window.toggleMessageMenu = (messageId) => messagingManager.toggleMessageMenu(messageId);
window.replyToMessage = (messageId, messageText) => messagingManager.replyToMessage(messageId, messageText);
window.cancelReply = () => messagingManager.cancelReply();
window.unsendMessage = (messageId) => messagingManager.unsendMessage(messageId);



async function loadRecentChats() {
    try {
        document.getElementById('messageModalTitle').textContent = 'Recent Chats';
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '<button id="createGroupBtn" style="position: absolute; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: #e74c3c; color: white; border: none; font-size: 18px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100;"><i class="fas fa-users"></i></button>';

        // Load group chats
        const groupChatsSnapshot = await db.collection('groupChats')
            .where('members', 'array-contains', authManager.currentUser.uid).get();

        for (const doc of groupChatsSnapshot.docs) {
            const group = doc.data();
            const chatItem = document.createElement('div');
            chatItem.className = 'friend-item';
            chatItem.style.cursor = 'pointer';
            chatItem.onclick = () => messagingManager.openGroupChat(doc.id);
            chatItem.innerHTML = `
                <div class="friend-info">
                    <div style="width: 40px; height: 40px; background: #e74c3c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="friend-details">
                        <div class="friend-name">${group.name}</div>
                        <div class="friend-status">
                            <span style="color: #888; font-size: 12px;">${group.members.length} members</span>
                        </div>
                    </div>
                </div>
                <div class="friend-actions">
                    <i class="fas fa-comments" style="color: var(--primary);"></i>
                </div>
            `;
            messagesList.appendChild(chatItem);
        }

        // Load friend chats
        const friendsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();

        for (const doc of friendsSnapshot.docs) {
            const friend = doc.data();
            const friendProfile = await db.collection('players').doc(friend.friendId).get();
            const friendData = friendProfile.data();
            const onlineStatus = await friendsManager.getOnlineStatus(friend.friendId);

            const chatItem = document.createElement('div');
            chatItem.className = 'friend-item';
            chatItem.style.cursor = 'pointer';
            chatItem.onclick = () => messagingManager.openChat(friend.friendId);
            chatItem.innerHTML = `
                <div class="friend-info">
                    <img src="avatars/${friendData.avatar}" alt="Avatar" class="friend-avatar">
                    <div class="friend-details">
                        <div class="friend-name">@${friend.username}</div>
                        <div class="friend-status">
                            <span class="online-status ${onlineStatus.isOnline ? 'status-online' : 'status-offline'}"></span>
                            ${!onlineStatus.isOnline ? `<span class="last-seen">${onlineStatus.lastSeen}</span>` : '<span class="online-text">Online</span>'}
                        </div>
                    </div>
                </div>
                <div class="friend-actions">
                    <i class="fas fa-comment" style="color: var(--primary);"></i>
                </div>
            `;
            messagesList.appendChild(chatItem);
        }

        if (groupChatsSnapshot.empty && friendsSnapshot.empty) {
            messagesList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No chats available</p>';
        }
    } catch (error) {
        console.error('Load recent chats error:', error);
    }
}

async function loadFriendsForGroup() {
    try {
        const friendsSelection = document.getElementById('friendsSelection');
        friendsSelection.innerHTML = '';

        const friendsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();

        if (friendsSnapshot.empty) {
            friendsSelection.innerHTML = '<p style="text-align: center; color: #888;">No friends available</p>';
            return;
        }

        for (const doc of friendsSnapshot.docs) {
            const friend = doc.data();
            const friendProfile = await db.collection('players').doc(friend.friendId).get();
            const friendData = friendProfile.data();

            const friendItem = document.createElement('div');
            friendItem.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid #333; border-radius: 4px; margin-bottom: 8px;';
            friendItem.innerHTML = `
                <input type="checkbox" value="${friend.friendId}" style="margin: 0;">
                <img src="avatars/${friendData.avatar}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                <span style="color: white;">@${friend.username}</span>
            `;
            friendsSelection.appendChild(friendItem);
        }
    } catch (error) {
        console.error('Load friends for group error:', error);
    }
}



// Setup notification handlers
function setupNotificationHandlers() {
    setTimeout(() => {
        const notificationIcon = document.getElementById('notificationIcon');
        const messageIcon = document.getElementById('messageIcon');

        if (notificationIcon) {
            let notificationClickTimeout;
            notificationIcon.addEventListener('click', function (e) {
                if (notificationClickTimeout) return;
                notificationClickTimeout = setTimeout(() => { notificationClickTimeout = null; }, 500);

                e.preventDefault();
                e.stopPropagation();
                openModal(document.getElementById('notificationsModal'));
                socialManager.loadNotifications();
                updateNotificationBadge(0);
            });
        }

        if (messageIcon) {
            let messageClickTimeout;
            messageIcon.addEventListener('click', function (e) {
                if (messageClickTimeout) return;
                messageClickTimeout = setTimeout(() => { messageClickTimeout = null; }, 500);

                e.preventDefault();
                e.stopPropagation();
                const messageInputContainer = document.querySelector('.message-input-container');
                if (messageInputContainer) messageInputContainer.style.display = 'none';


                openModal(document.getElementById('messagesModal'));
                loadRecentChats();
            });
        }
    }, 1000);
}

// Online presence system
function setupOnlinePresence() {
    const userStatusRef = db.collection('presence').doc(authManager.currentUser.uid);

    userStatusRef.set({
        isOnline: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });

    const handleBeforeUnload = () => {
        userStatusRef.set({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    window.cleanupPresence = () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };

    setInterval(() => {
        userStatusRef.update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }, 30000);
}



// Notification counters
function setupNotificationCounters() {
    db.collection('players').doc(authManager.currentUser.uid)
        .collection('friendRequests').where('status', '==', 'pending')
        .onSnapshot(snapshot => {
            updateNotificationBadge(snapshot.size);
        });

    db.collection('players').doc(authManager.currentUser.uid)
        .collection('notifications').where('read', '==', false)
        .onSnapshot(snapshot => {
            const currentBadge = parseInt(document.getElementById('notificationBadge').textContent) || 0;
            const friendRequests = parseInt(document.getElementById('notificationBadge').dataset.friendRequests) || 0;
            updateNotificationBadge(friendRequests + snapshot.size);
        });

    db.collection('messages')
        .where('participants', 'array-contains', authManager.currentUser.uid)
        .onSnapshot(snapshot => {
            let unreadCount = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.senderId !== authManager.currentUser.uid &&
                    (!data.readBy || !data.readBy.includes(authManager.currentUser.uid))) {
                    unreadCount++;
                }
            });
            updateMessageBadge(unreadCount);
        });
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function updateMessageBadge(count) {
    const badge = document.getElementById('messageBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Master password setup functions
function showMasterPasswordSetup() {
    document.getElementById('masterPasswordModalTitle').textContent = 'Set Master Password for Encryption';
    document.getElementById('confirmMasterPasswordInput').style.display = 'block';
    document.getElementById('unlockDashboardBtn').textContent = 'Set Master Password';
    document.getElementById('forgotPasswordBtn').style.display = 'none';
    openModal(document.getElementById('masterPasswordPromptModal'));
}

async function setupMasterPassword(masterPassword, confirmPassword) {
    if (!masterPassword || !confirmPassword) {
        showMessageBox('Please fill in both fields', 'error');
        return false;
    }

    if (masterPassword !== confirmPassword) {
        showMessageBox('Passwords do not match', 'error');
        return false;
    }

    if (masterPassword.length < 8) {
        showMessageBox('Master password must be at least 8 characters', 'error');
        return false;
    }

    try {
        const userSalt = generateSalt();
        const derivedKey = await deriveKey(masterPassword, userSalt);
        const masterPasswordHash = derivedKey.toString(CryptoJS.enc.Hex);

        await db.collection('players').doc(authManager.currentUser.uid).update({
            salt: userSalt,
            masterPasswordHash: masterPasswordHash,
            hasMasterPassword: true
        });

        authManager.currentEncryptionKey = derivedKey;
        authManager.secureStoreKey('currentEncryptionKeyHex', derivedKey.toString(CryptoJS.enc.Hex));

        // Generate recovery key
        const recoveryKey = generateRecoveryKey();
        const encryptedMasterKey = encryptWithRecoveryKey(derivedKey.toString(CryptoJS.enc.Hex), recoveryKey);

        await db.collection('players').doc(authManager.currentUser.uid).update({
            encryptedMasterKey: encryptedMasterKey
        });

        showRecoveryKey(recoveryKey);
        showMessageBox('Master password set successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Setup master password error:', error);
        showMessageBox('Failed to set master password', 'error');
        return false;
    }
}

function generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

async function deriveKey(masterPassword, salt) {
    return CryptoJS.PBKDF2(masterPassword, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations: 200000,
        hasher: CryptoJS.algo.SHA256
    });
}

function generateRecoveryKey() {
    return CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Base64).replace(/[+/=]/g, '').substring(0, 32);
}

function encryptWithRecoveryKey(data, recoveryKey) {
    const key = CryptoJS.SHA256(recoveryKey);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
}

function decryptWithRecoveryKey(encryptedData, recoveryKey) {
    const key = CryptoJS.SHA256(recoveryKey);
    const parts = encryptedData.split(':');
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const decrypted = CryptoJS.AES.decrypt(parts[1], key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function showRecoveryKey(recoveryKey) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;border:1px solid #333;">
            <h3 style="color:#e74c3c;margin-bottom:20px;">⚠️ SAVE YOUR RECOVERY KEY</h3>
            <p style="margin-bottom:20px;color:white;">This is your ONLY way to recover your data if you forget your master password:</p>
            <div style="background:#2d2d2d;color:#00ff00;padding:15px;border:2px solid #007bff;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:20px 0;word-break:break-all;">${recoveryKey}</div>
            <p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">Write this down and store it safely offline!</p>
            <button id="recoveryKeySaved" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">I've Saved It Safely</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('recoveryKeySaved').onclick = () => {
        document.body.removeChild(modal);
    };
}

async function recoverWithKey(recoveryKey) {
    if (!recoveryKey || recoveryKey.length !== 32) {
        showMessageBox('Please enter a valid 32-character recovery key', 'error');
        return false;
    }

    // Validate recovery key format and entropy
    if (!/^[A-Za-z0-9]{32}$/.test(recoveryKey)) {
        showMessageBox('Invalid recovery key format', 'error');
        return false;
    }

    // Check for minimum entropy (no repeated patterns)
    const uniqueChars = new Set(recoveryKey).size;
    if (uniqueChars < 16) {
        showMessageBox('Invalid recovery key - insufficient entropy', 'error');
        return false;
    }

    try {
        const playerDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const data = playerDoc.data();

        if (!data.encryptedMasterKey) {
            showMessageBox('No recovery key found for this account', 'error');
            return false;
        }

        const oldMasterKeyHex = decryptWithRecoveryKey(data.encryptedMasterKey, recoveryKey);
        if (!oldMasterKeyHex) {
            showMessageBox('Invalid recovery key', 'error');
            return false;
        }

        // Temporarily set old key to decrypt existing data
        const oldKey = CryptoJS.enc.Hex.parse(oldMasterKeyHex);

        // Re-encrypt all existing data with new password-derived key
        await reencryptUserData(oldKey);

        showMessageBox('Access recovered successfully! You can now use your new password.', 'success');
        return true;
    } catch (error) {
        console.error('Recovery error:', error);
        showMessageBox('Recovery failed. Check your key and try again.', 'error');
        return false;
    }
}

async function syncWithNewPassword(recoveredKeyHex) {
    try {
        const user = authManager.currentUser;
        if (!user) return false;

        const currentPassword = sessionStorage.getItem('tempLoginPassword');

        if (currentPassword) {
            // Use the new password to derive the encryption key
            const newSalt = generateSalt();
            const newDerivedKey = await deriveKey(currentPassword, newSalt);
            const newMasterPasswordHash = newDerivedKey.toString(CryptoJS.enc.Hex);

            // Generate new recovery key for the new derived key
            const newRecoveryKey = generateRecoveryKey();
            const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);

            await db.collection('players').doc(user.uid).update({
                salt: newSalt,
                masterPasswordHash: newMasterPasswordHash,
                encryptedMasterKey: newEncryptedMasterKey,
                recoveredFromKey: false
            });

            // Set the new derived key as the current encryption key
            authManager.currentEncryptionKey = newDerivedKey;
            const sessionKey = CryptoJS.SHA256(navigator.userAgent + window.location.origin).toString();
            const encrypted = CryptoJS.AES.encrypt(newMasterPasswordHash, sessionKey).toString();
            sessionStorage.setItem('currentEncryptionKeyHex', encrypted);

            sessionStorage.removeItem('tempLoginPassword');
            showRecoveryKey(newRecoveryKey);
        } else {
            await db.collection('players').doc(user.uid).update({
                recoveredFromKey: false
            });
        }

        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

async function reencryptUserData(oldKey) {
    const user = authManager.currentUser;
    const currentPassword = sessionStorage.getItem('tempLoginPassword');

    if (!currentPassword) return;

    // Generate new encryption setup
    const newSalt = generateSalt();
    const newKey = await deriveKey(currentPassword, newSalt);
    const newMasterPasswordHash = newKey.toString(CryptoJS.enc.Hex);

    // Re-encrypt notes
    const notesRef = db.collection('players').doc(user.uid).collection('notes');
    const notesSnapshot = await notesRef.get();

    const batch = db.batch();

    notesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.content) {
            // Decrypt with old key
            const decrypted = decryptData(data.content, oldKey);
            if (decrypted) {
                // Re-encrypt with new key
                const reencrypted = encryptData(decrypted, newKey);
                batch.update(doc.ref, { content: reencrypted });
            }
        }
    });

    // Re-encrypt passwords
    const passwordsRef = db.collection('players').doc(user.uid).collection('passwords');
    const passwordsSnapshot = await passwordsRef.get();

    passwordsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.password) {
            const decrypted = decryptData(data.password, oldKey);
            if (decrypted) {
                const reencrypted = encryptData(decrypted, newKey);
                batch.update(doc.ref, { password: reencrypted });
            }
        }
    });

    // Update player document
    const newRecoveryKey = generateRecoveryKey();
    const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);

    batch.update(db.collection('players').doc(user.uid), {
        salt: newSalt,
        masterPasswordHash: newMasterPasswordHash,
        encryptedMasterKey: newEncryptedMasterKey,
        recoveredFromKey: false
    });

    await batch.commit();

    // Set new key as current
    authManager.currentEncryptionKey = newKey;
    authManager.secureStoreKey('currentEncryptionKeyHex', newMasterPasswordHash);
    sessionStorage.removeItem('tempLoginPassword');

    showRecoveryKey(newRecoveryKey);
}

async function syncWithCurrentPassword(currentPassword) {
    if (!currentPassword) {
        showMessageBox('Please enter your current password', 'error');
        return false;
    }

    if (!window.tempRecoveredKey) {
        showMessageBox('No recovery key found. Please try again.', 'error');
        return false;
    }

    try {
        const playerDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const data = playerDoc.data();
        const newDerivedKey = await deriveKey(currentPassword, data.salt);
        const newMasterPasswordHash = newDerivedKey.toString(CryptoJS.enc.Hex);

        // Generate new recovery key for the new password
        const newRecoveryKey = generateRecoveryKey();
        const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);

        await db.collection('players').doc(authManager.currentUser.uid).update({
            masterPasswordHash: newMasterPasswordHash,
            encryptedMasterKey: newEncryptedMasterKey
        });

        // Set the correct encryption key
        authManager.currentEncryptionKey = CryptoJS.enc.Hex.parse(window.tempRecoveredKey);
        authManager.secureStoreKey('currentEncryptionKeyHex', window.tempRecoveredKey);

        // Clean up
        delete window.tempRecoveredKey;

        showMessageBox('Password synced successfully! You can now use your login password.', 'success');
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        showMessageBox('Failed to sync password', 'error');
        return false;
    }
}

// Master password prompt helper
async function showMasterPasswordPrompt(targetModal) {
    // Check if account was recovered from password reset
    const wasPasswordReset = await authManager.checkPasswordResetStatus();

    if (wasPasswordReset) {
        // For password reset accounts, show recovery key modal instead
        document.getElementById(targetModal).dataset.pendingOpen = 'true';
        openModal(document.getElementById('recoveryKeyModal'));
        showMessageBox('Password was reset. Please use your recovery key to access encrypted data.', 'warning', 4000);
    } else {
        // Normal master password prompt
        document.getElementById('masterPasswordModalTitle').textContent = 'Enter Master Password';
        document.getElementById('confirmMasterPasswordInput').style.display = 'none';
        document.getElementById('unlockDashboardBtn').textContent = 'Unlock';
        document.getElementById('forgotPasswordBtn').style.display = 'block';
        document.getElementById(targetModal).dataset.pendingOpen = 'true';
        openModal(document.getElementById('masterPasswordPromptModal'));
    }
}

// Initialize application
$(document).ready(function () {
    setupEventListeners();
    loadAvatars();
    new DesktopDashboard();

    // Group chat handlers
    $(document).on('click', '#createGroupBtn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openModal(document.getElementById('createGroupModal'));
        loadFriendsForGroup();
    });

    $(document).on('click', '#createGroupChatBtn', async function () {
        const groupName = document.getElementById('groupNameInput').value.trim();
        const selectedFriends = Array.from(document.querySelectorAll('#friendsSelection input:checked')).map(cb => cb.value);

        if (!groupName || selectedFriends.length === 0) {
            showMessageBox('Please enter group name and select friends', 'error', 3000);
            return;
        }

        try {
            const groupId = await messagingManager.createGroupChat(groupName, selectedFriends);
            closeModal(document.getElementById('createGroupModal'));
            messagingManager.openGroupChat(groupId);
            showMessageBox('Group chat created!', 'success', 2000);
            document.getElementById('groupNameInput').value = '';
        } catch (error) {
            console.error('Create group error:', error);
            showMessageBox('Failed to create group', 'error', 3000);
        }
    });
});