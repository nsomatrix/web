import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Wait for Firebase to be ready
let auth, db;

function initializeFirebase() {
    if (window.firebaseReady && window.firebaseAuth && window.firebaseDb) {
        auth = window.firebaseAuth;
        db = window.firebaseDb;
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

    messageText.innerText = message;
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
        button.innerHTML = `
            <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.3"></circle>
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
            <span style="margin-left: 8px;">${originalText === 'Sign in' ? 'Signing in' : 'Signing up'}</span>
        `;
        button.disabled = true;
    } else {
        button.innerHTML = originalText;
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
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessageBox('Please fill in all fields', 'error');
        return;
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
            if (playerData.recoveredFromKey) {
                // Account was recovered with recovery key, use stored master password hash directly
                sessionStorage.setItem('currentEncryptionKeyHex', playerData.masterPasswordHash);
            } else {
                // Normal login, derive key from password
                const derivedEncryptionKey = await deriveKey(password, playerData.salt);
                sessionStorage.setItem('currentEncryptionKeyHex', derivedEncryptionKey.toString(CryptoJS.enc.Hex));
            }
        }

        localStorage.setItem('userLoggedIn', 'true');
        showMessageBox('Login successful! Redirecting', 'success');
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } catch (err) {
        let errorMessage = 'Login failed. Please try again.';
        if (err.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (err.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (err.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid credentials. Check your email and password.';
        }
        showMessageBox(errorMessage, 'error');
    } finally {
        setButtonLoading(primaryBtn, false, 'Sign in');
    }
}

// --- Signup Functionality ---
async function handleSignup() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !password || !confirmPassword) {
        showMessageBox('Please fill in all fields', 'error');
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
        
        showMessageBox('Account created successfully!', 'success');
        showRecoveryKey(recoveryKey);

    } catch (err) {
        let errorMessage = 'Account creation failed. Please try again.';
        if (err.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (err.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
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
    modal.innerHTML = `
        <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;border:1px solid #333;">
            <h3 style="color:#e74c3c;margin-bottom:20px;">⚠️ SAVE YOUR RECOVERY KEY</h3>
            <p style="margin-bottom:20px;color:white;">This is your ONLY way to recover access if you reset your password:</p>
            <div id="recoveryKeyDisplay" style="background:#2d2d2d;color:#00ff00;padding:15px;border:2px solid #007bff;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:20px 0;word-break:break-all;">${recoveryKey}</div>
            <div style="margin:15px 0;">
                <button id="copyKeyBtn" style="background:#007bff;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Copy to Clipboard</button>
                <button id="downloadKeyBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Download as TXT</button>
            </div>
            <p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">Write this down and store it safely offline!</p>
            <button id="recoveryKeySaved" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">I've Saved It Safely</button>
        </div>
    `;
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
