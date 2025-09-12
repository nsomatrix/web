// Navbar Authentication State Management
let authButton, authIcon, authText;

function initializeNavbarAuth() {
    authButton = document.getElementById('auth-button');
    authIcon = document.getElementById('auth-icon');
    authText = document.getElementById('auth-text');
    
    if (!authButton || !authIcon || !authText) {
        console.warn('Navbar auth elements not found');
        return;
    }
    
    // Set up click handler
    authButton.addEventListener('click', handleAuthClick);
    
    // Check initial auth state
    checkAuthState();
}

function checkAuthState() {
    // Check if Firebase is available and user is logged in
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            updateNavbarAuthState(!!user);
        });
    } else {
        // Fallback: check localStorage for auth state
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        updateNavbarAuthState(isLoggedIn);
    }
}

function updateNavbarAuthState(isLoggedIn) {
    if (!authButton || !authIcon || !authText) return;
    
    if (isLoggedIn) {
        // User is logged in - show logout
        authIcon.className = 'fa fa-sign-out-alt';
        authText.textContent = 'Logout';
        authButton.classList.add('logout-state');
        authButton.href = '#';
        authButton.title = 'Click to logout';
    } else {
        // User is not logged in - show login
        authIcon.className = 'fa fa-sign-in-alt';
        authText.textContent = 'Login';
        authButton.classList.remove('logout-state');
        authButton.href = 'login.html';
        authButton.title = 'Click to login';
    }
}

function handleAuthClick(event) {
    const isLoggedIn = authButton.classList.contains('logout-state');
    
    if (isLoggedIn) {
        // Handle logout
        event.preventDefault();
        performLogout();
    } else {
        // Handle login - let default behavior happen (navigate to login.html)
        return true;
    }
}

function performLogout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        // Use Firebase logout
        firebase.auth().signOut().then(function() {
            console.log('User signed out successfully');
            updateNavbarAuthState(false);
            // Clear any stored auth data
            localStorage.removeItem('userLoggedIn');
            sessionStorage.clear();
            
            // Redirect to home page
            window.location.href = 'index.html';
        }).catch(function(error) {
            console.error('Error signing out:', error);
            // Still update UI even if Firebase logout fails
            updateNavbarAuthState(false);
            localStorage.removeItem('userLoggedIn');
            window.location.href = 'index.html';
        });
    } else {
        // Fallback logout
        console.log('Firebase not available, performing fallback logout');
        updateNavbarAuthState(false);
        localStorage.removeItem('userLoggedIn');
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// Function to manually set login state (can be called from other pages)
function setNavbarLoginState(isLoggedIn) {
    updateNavbarAuthState(isLoggedIn);
    localStorage.setItem('userLoggedIn', isLoggedIn.toString());
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavbarAuth);
} else {
    initializeNavbarAuth();
}

// Also initialize after navbar is loaded dynamically
$(document).ready(function() {
    // Wait a bit for navbar to be fully loaded
    setTimeout(initializeNavbarAuth, 100);
});
