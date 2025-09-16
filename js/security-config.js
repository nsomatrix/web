// Security configuration and utilities
export const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    MAX_EMAIL_LENGTH: 254,
    MIN_PASSWORD_LENGTH: 8
};

// Input sanitization utilities
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>\"'&]/g, '');
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= SECURITY_CONFIG.MAX_EMAIL_LENGTH;
}

export function sanitizeErrorMessage(error) {
    // Log full error for debugging
    console.error('Error details:', error);
    
    // Return generic message to user
    const genericMessages = {
        'auth/user-not-found': 'Invalid credentials',
        'auth/wrong-password': 'Invalid credentials',
        'auth/invalid-credential': 'Invalid credentials',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password too weak',
        'auth/invalid-email': 'Invalid email format'
    };
    
    return genericMessages[error.code] || 'Operation failed. Please try again.';
}