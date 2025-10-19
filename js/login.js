import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { TwoFactorAuth } from './modules/two-factor.js';

// Wait for Firebase to be ready
let auth, db, twoFactorAuth;

function initializeFirebase() {
    if (window.firebaseReady && window.firebaseAuth && window.firebaseDb) {
        auth = window.firebaseAuth;
        db = window.firebaseDb;
        twoFactorAuth = new TwoFactorAuth(auth, db);
        return true;
    }
    return false;
}

// Initialize immediately or wait for ready event
if (!initializeFirebase()) {
    document.addEventListener('firebaseReady', initializeFirebase);
}

const primaryBtn = document.getElementById("primaryBtn");
const switchBtn = document.getElementById("switchBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmPasswordContainer = document.getElementById("confirmPasswordContainer");
const formTitle = document.getElementById("formTitle");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordLinkAnchor = document.querySelector(".login .links a[href='#']");

const togglePassword = document.getElementById("togglePassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

let isSignupMode = false;
let turnstileToken = null;
let turnstileWidgetId = null;
let turnstileInitialized = false;

// Turnstile callback functions (must be global)
window.onTurnstileSuccess = function(token) {
    turnstileToken = token;
    const btn = document.getElementById('primaryBtn');
    if (btn) btn.disabled = false;
};

window.onTurnstileError = function(error) {
    turnstileToken = null;
    const btn = document.getElementById('primaryBtn');
    if (btn) btn.disabled = true;
    if (typeof showMessageBox === 'function') {
        showMessageBox('Security verification failed. Please try again.', 'error');
    }
    setTimeout(() => renderTurnstile(), 2000);
};

window.onTurnstileExpired = function() {
    turnstileToken = null;
    const btn = document.getElementById('primaryBtn');
    if (btn) btn.disabled = true;
    if (typeof showMessageBox === 'function') {
        showMessageBox('Security verification expired. Please verify again.', 'error');
    }
};

// Reset Turnstile when switching modes
function resetTurnstile() {
    turnstileToken = null;
    const btn = document.getElementById('primaryBtn');
    if (btn) btn.disabled = true;
    
    if (window.turnstile && turnstileWidgetId !== null) {
        try {
            window.turnstile.reset(turnstileWidgetId);
        } catch (e) {

            // Force re-render if reset fails
            setTimeout(renderTurnstile, 100);
        }
    } else {
        // If no widget ID, re-render
        setTimeout(renderTurnstile, 100);
    }
}

// Render Turnstile widget
function renderTurnstile() {
    const container = document.getElementById('turnstile-container');
    if (!container || !window.turnstile) {
        setTimeout(renderTurnstile, 500);
        return;
    }
    
    try {
        container.innerHTML = '';
        turnstileWidgetId = window.turnstile.render(container, {
            sitekey: '0x4AAAAAAB6AxJBsBeZyr7Mv',
            callback: window.onTurnstileSuccess,
            'error-callback': window.onTurnstileError,
            'expired-callback': window.onTurnstileExpired,
            theme: 'dark',
            size: 'normal'
        });
    } catch (e) {
        setTimeout(renderTurnstile, 1000);
    }
}

// Initialize Turnstile when script loads
function initTurnstile() {
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkTurnstile = () => {
        attempts++;
        if (window.turnstile && typeof window.turnstile.render === 'function') {
            turnstileInitialized = true;
            renderTurnstile();
        } else if (attempts < maxAttempts) {
            setTimeout(checkTurnstile, 200);
        } else {
            const container = document.getElementById('turnstile-container');
            if (container) {
                const errorMsg = document.createElement('p');
                errorMsg.style.cssText = 'color: red; text-align: center;';
                errorMsg.textContent = 'Security verification failed to load. Please ';
                
                const refreshLink = document.createElement('a');
                refreshLink.href = '#';
                refreshLink.textContent = 'refresh the page';
                refreshLink.onclick = () => location.reload();
                
                errorMsg.appendChild(refreshLink);
                errorMsg.appendChild(document.createTextNode('.'));
                container.innerHTML = '';
                container.appendChild(errorMsg);
            }
        }
    };
    
    checkTurnstile();
}

// Start initialization after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTurnstile);
} else {
    initTurnstile();
}

function setupPasswordToggle(toggleElement, inputElement) {
    if (toggleElement) {
        toggleElement.addEventListener("click", () => {
            const type = inputElement.getAttribute("type") === "password" ? "text" : "password";
            inputElement.setAttribute("type", type);
            const eyeIcon = toggleElement.querySelector('i');
            eyeIcon.classList.toggle('fa-eye');
            eyeIcon.classList.toggle('fa-eye-slash');
        });
    }
}

setupPasswordToggle(togglePassword, passwordInput);
setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

function switchMode() {
    isSignupMode = !isSignupMode;
    if (isSignupMode) {
        formTitle.textContent = "Sign Up";
        primaryBtn.textContent = "Sign Up";
        switchBtn.textContent = "Login";
        confirmPasswordContainer.style.display = "block";
        forgotPasswordLink.style.display = "none";
    } else {
        formTitle.textContent = "Login";
        primaryBtn.textContent = "Sign in";
        switchBtn.textContent = "Sign Up";
        confirmPasswordContainer.style.display = "none";
        forgotPasswordLink.style.display = "block";
    }
    resetTurnstile();
}

switchBtn.addEventListener("click", switchMode);

// --- Utility Functions (for messages and spinners) ---
function showMessageBox(message, type = 'info', duration = 4000) {
    let messageBox = document.getElementById('customMessageBox');
    let messageText = document.getElementById('messageBoxText');

    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'customMessageBox';
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ffffff;
            color: #374151;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
            z-index: 10000;
            font-family: inherit;
            font-size: 0.875rem;
            font-weight: 500;
            display: none;
            min-width: 300px;
            border-left: 4px solid #3b82f6;
            animation: slideInRight 0.3s ease-out;
        `;
        messageText = document.createElement('p');
        messageText.id = 'messageBoxText';
        messageBox.appendChild(messageText);
        document.body.appendChild(messageBox);
    }

    messageText.textContent = message;
    messageBox.style.display = 'block';

    if (type === 'error') {
        messageBox.style.borderLeftColor = '#ef4444';
        messageBox.style.color = '#dc2626';
    } else if (type === 'success') {
        messageBox.style.borderLeftColor = '#10b981';
        messageBox.style.color = '#059669';
    } else {
        messageBox.style.borderLeftColor = '#3b82f6';
        messageBox.style.color = '#374151';
    }

    setTimeout(() => {
        messageBox.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            messageBox.style.display = 'none';
            messageBox.style.animation = 'slideInRight 0.3s ease-out';
        }, 300);
    }, duration);
}

function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        const spinner = document.createElement('div');
        spinner.className = 'login-spinner';
        
        const span = document.createElement('span');
        span.style.marginLeft = '8px';
        span.textContent = originalText === 'Sign in' ? 'Signing in' : 'Signing up';
        
        button.innerHTML = '';
        button.appendChild(spinner);
        button.appendChild(span);
        button.disabled = true;
    } else {
        button.textContent = originalText;
        button.disabled = false;
    }
}



// --- Primary Action Handler ---
async function handlePrimaryAction() {
    if (isSignupMode) {
        await handleSignup();
    } else {
        await handleLogin();
    }
}

// --- Login Functionality ---
async function handleLogin() {
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';

    // Input validation
    if (!email || !password) {
        showMessageBox('Please fill in all fields', 'error');
        return;
    }
    
    if (email.length > 254 || password.length > 128) {
        showMessageBox('Input too long', 'error');
        return;
    }
    
    if (!turnstileToken) {
        // Check if Turnstile is completely broken
        const container = document.getElementById('turnstile-container');
        const hasWidget = container && container.querySelector('iframe');
        
        if (!hasWidget && turnstileInitialized) {
            renderTurnstile();
        }
        
        if (!turnstileInitialized && window.location.hostname === 'localhost') {
            turnstileToken = 'dev-bypass-token';
        } else {
            showMessageBox('Please complete the security verification', 'error');
            return;
        }
    }

    if (!email.includes('@')) {
        showMessageBox('Please enter a valid email address', 'error');
        return;
    }

    if (!auth || !db) {
        showMessageBox('Firebase not ready, please try again', 'error');
        return;
    }

    setButtonLoading(primaryBtn, true, 'Sign in');

    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const playerDoc = await getDoc(doc(db, "players", user.uid));
        const playerData = playerDoc.data();

        if (playerData && playerData.salt && playerData.masterPasswordHash) {
            // Store temporary password for recovery sync
            sessionStorage.setItem('tempLoginPassword', password);
            
            if (playerData.recoveredFromKey) {
                // Account needs recovery - don't set encryption key yet
                // Will be set after recovery key is used
            } else {
                // Normal login, derive key from password
                const derivedEncryptionKey = await deriveKey(password, playerData.salt);
                const derivedKeyHex = derivedEncryptionKey.toString(CryptoJS.enc.Hex);
                
                // Check if derived key matches stored hash
                if (derivedKeyHex !== playerData.masterPasswordHash) {
                    // Password was likely reset, mark account for recovery
                    await setDoc(doc(db, "players", user.uid), {
                        ...playerData,
                        recoveredFromKey: true
                    });
                } else {
                    // Use the derived key as encryption key (this is the actual encryption key)
                    sessionStorage.setItem('currentEncryptionKeyHex', derivedKeyHex);
                }
            }
        }

        // Check 2FA
        const requires2FA = await twoFactorAuth.requiresTwoFactor(user);
        if (requires2FA) {
            const verified = await twoFactorAuth.verifyTwoFactor(user);
            if (!verified) {
                await auth.signOut();
                showMessageBox('Two-factor authentication failed', 'error');
                return;
            }
        }
        
        localStorage.setItem('userLoggedIn', 'true');
        showMessageBox('Login successful! Redirecting', 'success');
        
        // Clean up temp password after a delay (dashboard will use it if needed)
        setTimeout(() => {
            if (!sessionStorage.getItem('recoveryInProgress')) {
                sessionStorage.removeItem('tempLoginPassword');
            }
        }, 10000);
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } catch (err) {
        let errorMessage = 'Login failed. Please try again.';
        
        // Handle specific Firebase auth errors
        switch (err?.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Invalid credentials. Check your email and password.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
            default:

        }
        
        showMessageBox(errorMessage, 'error');
    } finally {
        setButtonLoading(primaryBtn, false, 'Sign in');
    }
}

// --- Signup Functionality ---
async function handleSignup() {
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';

    // Input validation
    if (!email || !password || !confirmPassword) {
        showMessageBox('Please fill in all fields', 'error');
        return;
    }
    
    if (email.length > 254 || password.length > 128) {
        showMessageBox('Input too long', 'error');
        return;
    }
    
    if (!turnstileToken) {
        showMessageBox('Please complete the security verification', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessageBox('Passwords do not match', 'error');
        return;
    }

    if (!email.includes('@')) {
        showMessageBox('Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 8) {
        showMessageBox('Password must be at least 8 characters long', 'error');
        return;
    }

    if (!auth || !db) {
        showMessageBox('Service not ready, please try again', 'error');
        return;
    }

    setButtonLoading(primaryBtn, true, 'Sign Up');

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const userSalt = generateSalt();
        const derivedKey = await deriveKey(password, userSalt);
        const masterPasswordHash = derivedKey.toString(CryptoJS.enc.Hex);
        
        // Generate recovery key
        const recoveryKey = generateRecoveryKey();
        const encryptedMasterKey = encryptWithRecoveryKey(masterPasswordHash, recoveryKey);

        await setDoc(doc(db, "players", user.uid), {
            level: 1,
            salt: userSalt,
            masterPasswordHash: masterPasswordHash,
            encryptedMasterKey: encryptedMasterKey
        });

        sessionStorage.setItem('currentEncryptionKeyHex', masterPasswordHash);
        localStorage.setItem('userLoggedIn', 'true');
        
        // Prevent automatic redirect during recovery key display
        sessionStorage.setItem('showingRecoveryKey', 'true');
        
        showMessageBox('Account created successfully!', 'success');
        showRecoveryKey(recoveryKey);

    } catch (err) {
        let errorMessage = 'Account creation failed. Please try again.';
        
        // Handle specific Firebase auth errors
        switch (err?.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
            default:

        }
        
        showMessageBox(errorMessage, 'error');
    } finally {
        setButtonLoading(primaryBtn, false, 'Sign Up');
    }
}

primaryBtn.onclick = handlePrimaryAction;

[emailInput, passwordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handlePrimaryAction();
        }
    });
});

// --- Key Derivation Functions ---
function generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

async function deriveKey(password, salt) {
    return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
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

function showRecoveryKey(recoveryKey) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;border:1px solid #333;';
    
    const title = document.createElement('h3');
    title.style.cssText = 'color:#e74c3c;margin-bottom:20px;';
    title.textContent = '⚠️ SAVE YOUR RECOVERY KEY';
    
    const description = document.createElement('p');
    description.style.cssText = 'margin-bottom:20px;color:white;';
    description.textContent = 'This is your ONLY way to recover access if you reset your password:';
    
    const keyDisplay = document.createElement('div');
    keyDisplay.id = 'recoveryKeyDisplay';
    keyDisplay.style.cssText = 'background:#2d2d2d;color:#00ff00;padding:15px;border:2px solid #007bff;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:20px 0;word-break:break-all;';
    keyDisplay.textContent = recoveryKey;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin:15px 0;';
    
    const copyBtn = document.createElement('button');
    copyBtn.id = 'copyKeyBtn';
    copyBtn.style.cssText = 'background:#007bff;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;';
    copyBtn.textContent = 'Copy to Clipboard';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'downloadKeyBtn';
    downloadBtn.style.cssText = 'background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;';
    downloadBtn.textContent = 'Download as TXT';
    
    const warning = document.createElement('p');
    warning.style.cssText = 'color:#e74c3c;font-weight:bold;margin-bottom:20px;';
    warning.textContent = 'Write this down and store it safely offline!';
    
    const savedBtn = document.createElement('button');
    savedBtn.id = 'recoveryKeySaved';
    savedBtn.style.cssText = 'background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;';
    savedBtn.textContent = "I've Saved It Safely";
    
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(downloadBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(description);
    modalContent.appendChild(keyDisplay);
    modalContent.appendChild(buttonContainer);
    modalContent.appendChild(warning);
    modalContent.appendChild(savedBtn);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('copyKeyBtn').onclick = () => {
        navigator.clipboard.writeText(recoveryKey).then(() => {
            showMessageBox('Recovery key copied to clipboard!', 'success', 2000);
        }).catch(() => {
            showMessageBox('Failed to copy. Please copy manually.', 'error', 2000);
        });
    };
    
    document.getElementById('downloadKeyBtn').onclick = () => {
        const blob = new Blob([`Matrix Recovery Key\n\nYour recovery key: ${recoveryKey}\n\nKeep this safe! This is the only way to recover your encrypted data if you reset your password.\n\nGenerated: ${new Date().toLocaleString()}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'matrix-recovery-key.txt';
        a.click();
        URL.revokeObjectURL(url);
        showMessageBox('Recovery key downloaded!', 'success', 2000);
    };
    
    document.getElementById('recoveryKeySaved').onclick = () => {
        document.body.removeChild(modal);
        // Clear the flag to allow normal auth flow
        sessionStorage.removeItem('showingRecoveryKey');
        showMessageBox('Redirecting to dashboard...', 'success');
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    };
}

// --- Forgot Password Functionality ---
forgotPasswordLinkAnchor.onclick = (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
        showMessageBox("Please enter your email address to reset your password.", 'error');
        return;
    }

    if (!email.includes('@')) {
        showMessageBox("Please enter a valid email address.", 'error');
        return;
    }

    showMessageBox("Sending password reset email...");
    sendPasswordResetEmail(auth, email)
        .then(() => {
            showMessageBox("Password reset email sent! Check your inbox.", 'success');
            emailInput.value = '';
        })
        .catch(() => {
            showMessageBox("Failed to send password reset email. Please try again.", 'error');
        });
};
