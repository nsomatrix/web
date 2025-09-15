// Configuration constants
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCwEZaP_Oc7MRwfxIXyq0k7sH4LQBEc3YY",
    authDomain: "matrix-nso.firebaseapp.com",
    projectId: "matrix-nso",
    storageBucket: "matrix-nso.appspot.com",
    messagingSenderId: "32108162722",
    appId: "1:32108162722:web:7c80d154d4120111f271fb"
};

export const SUPABASE_CONFIG = {
    url: 'https://pshuqmmkxmwgmvhuaujn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHVxbW1reG13Z212aHVauWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzI4NDIsImV4cCI6MjA2NDg0ODg0Mn0.SiJ9fEjW-e-x8DOREhuS1snrAe-IuBeE5r3tNzjtPFw'
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