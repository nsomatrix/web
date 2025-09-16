// Configuration constants - Load from environment or fallback
function getEnvVar(key, fallback) {
    return typeof process !== 'undefined' && process.env ? process.env[key] : 
           (window.ENV && window.ENV[key]) || fallback;
}

export const FIREBASE_CONFIG = {
    apiKey: getEnvVar('FIREBASE_API_KEY', 'AIzaSyDp8p_wgeKO_WJAyewYiZhc3en7kF6RXs0'),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', 'nsomatrix-web.firebaseapp.com'),
    projectId: getEnvVar('FIREBASE_PROJECT_ID', 'nsomatrix-web'),
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', 'nsomatrix-web.firebasestorage.app'),
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '320519296982'),
    appId: getEnvVar('FIREBASE_APP_ID', '1:320519296982:web:1ab1b009aeaf7755b13677'),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', 'G-GK3J5PZW85')
};

export const SUPABASE_CONFIG = {
    url: getEnvVar('SUPABASE_URL', 'https://pshuqmmkxmwgmvhuaujn.supabase.co'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHVxbW1reG13Z212aHVauWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzI4NDIsImV4cCI6MjA2NDg0ODg0Mn0.SiJ9fEjW-e-x8DOREhuS1snrAe-IuBeE5r3tNzjtPFw')
};

export const CRYPTO_CONFIG = {
    PBKDF2_ITERATIONS: 200000,
    KEY_SIZE: 256 / 32,
    MAX_ATTEMPTS: 3,
    LOCKOUT_TIME: 30 * 1000,
    SESSION_TIMEOUT: 5 * 60 * 1000
};

export const FILE_CONFIG = {
    MAX_FILE_SIZE_MB: 5,
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024
};