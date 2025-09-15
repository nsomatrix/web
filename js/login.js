// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCwEZaP_Oc7MRwfxIXyq0k7sH4LQBEc3YY",
    authDomain: "matrix-nso.firebaseapp.com",
    projectId: "matrix-nso",
    storageBucket: "matrix-nso.firebasestorage.app",
    messagingSenderId: "32108162722",
    appId: "1:32108162722:web:7c80d154d4120111c271fb"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const forgotPasswordLink = document.querySelector(".login .links a[href='#']");

const togglePassword = document.getElementById("togglePassword");

if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);

        const eyeIcon = togglePassword.querySelector('i');
        if (type === "password") {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        } else {
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    });
}

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

// --- Key Derivation Functions (for Master Password) ---
const PBKDF2_ITERATIONS = 200000;
const KEY_SIZE = 256 / 32;

function generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

async function deriveKey(masterPassword, salt) {
    return CryptoJS.PBKDF2(masterPassword, CryptoJS.enc.Hex.parse(salt), {
        keySize: KEY_SIZE,
        iterations: PBKDF2_ITERATIONS,
        hasher: CryptoJS.algo.SHA256
    });
}

// --- Login Functionality ---
async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!email || !password) {
        showMessageBox('Please fill in all fields', 'error');
        return;
    }

    if (!email.includes('@')) {
        showMessageBox('Please enter a valid email address', 'error');
        return;
    }

    setButtonLoading(loginBtn, true, 'Sign in');

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        const user = userCred.user;

        // Fetch user's salt to derive encryption key
        const playerDoc = await db.collection("players").doc(user.uid).get();
        const playerData = playerDoc.data();

        if (playerData && playerData.salt && playerData.masterPasswordHash) {
            const derivedEncryptionKey = await deriveKey(password, playerData.salt);
            sessionStorage.setItem('currentEncryptionKeyHex', derivedEncryptionKey.toString(CryptoJS.enc.Hex));
        } else {
            console.warn("User data (salt/masterPasswordHash) missing for login. Encryption features might require manual unlock.");
        }

        // Set navbar login state
        if (typeof setNavbarLoginState === 'function') {
            setNavbarLoginState(true);
        } else {
            localStorage.setItem('userLoggedIn', 'true');
        }

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
        } else if (err.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        showMessageBox(errorMessage, 'error');
    } finally {
        setButtonLoading(loginBtn, false, 'Sign in');
    }
}

loginBtn.onclick = handleLogin;

emailInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
    }
});

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
    }
});

// --- Signup Functionality ---
signupBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    if (!email || !password) {
        showMessageBox('Please fill in all fields', 'error');
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

    setButtonLoading(signupBtn, true, 'Sign Up');

    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCred.user;

        const userSalt = generateSalt();
        const masterPasswordHash = (await deriveKey(password, userSalt)).toString(CryptoJS.enc.Hex);

        await db.collection("players").doc(user.uid).set({
            level: 1,
            salt: userSalt,
            masterPasswordHash: masterPasswordHash
        });

        const derivedEncryptionKey = await deriveKey(password, userSalt);
        sessionStorage.setItem('currentEncryptionKeyHex', derivedEncryptionKey.toString(CryptoJS.enc.Hex));

        showMessageBox('Account created successfully! Redirecting', 'success');
        
        if (typeof setNavbarLoginState === 'function') {
            setNavbarLoginState(true);
        } else {
            localStorage.setItem('userLoggedIn', 'true');
        }
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);

    } catch (err) {
        let errorMessage = 'Account creation failed. Please try again.';
        if (err.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (err.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (err.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        showMessageBox(errorMessage, 'error');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
    }
};

// --- Forgot Password Functionality ---
forgotPasswordLink.onclick = (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showMessageBox("Please enter your email address to reset your password.", 'error');
        return;
    }

    showMessageBox("Sending password reset email...");

    auth.sendPasswordResetEmail(email)
        .then(() => {
            showMessageBox("Password reset email sent! Check your inbox.", 'success');
            emailInput.value = '';
        })
        .catch((error) => {
            showMessageBox(`Error: ${error.message}`, 'error');
            console.error("Password reset error:", error);
        });
};
