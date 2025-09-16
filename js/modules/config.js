// Configuration constants - Industry standard approach
export const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDp8p_wgeKO_WJAyewYiZhc3en7kF6RXs0',
    authDomain: 'nsomatrix-web.firebaseapp.com',
    projectId: 'nsomatrix-web',
    storageBucket: 'nsomatrix-web.firebasestorage.app',
    messagingSenderId: '320519296982',
    appId: '1:320519296982:web:1ab1b009aeaf7755b13677',
    measurementId: 'G-GK3J5PZW85'
};

export const SUPABASE_CONFIG = {
    url: 'https://pshuqmmkxmwgmvhuaujn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHVxbW1reG13Z212aHVhdWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzI4NDIsImV4cCI6MjA2NDg0ODg0Mn0.SiJ9fEjW-e-x8DOREhuS1snrAe-IuBeE5r3tNzjtPFw'
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