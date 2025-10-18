// Magic Link Handler for Two-Factor Authentication
class MagicLinkHandler {
    constructor() {
        this.init();
    }

    init() {
        // Check if this is a magic link verification
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            this.handleMagicLinkVerification();
        }
    }

    async handleMagicLinkVerification() {
        try {
            const email = sessionStorage.getItem('emailForSignIn');
            if (!email) {
                window.showMessageBox('Invalid magic link session', 'error', 3000);
                return;
            }

            if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
                await firebase.auth().signInWithEmailLink(email, window.location.href);
                sessionStorage.removeItem('emailForSignIn');
                
                // Clear the URL parameter
                const url = new URL(window.location);
                url.searchParams.delete('verified');
                window.history.replaceState({}, document.title, url.pathname);
                
                window.showMessageBox('Two-factor authentication verified successfully', 'success', 3000);
            }
        } catch (error) {
            console.error('Magic link verification error:', error);
            window.showMessageBox('Magic link verification failed', 'error', 3000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MagicLinkHandler();
});