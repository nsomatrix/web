// Configuration constants - Industry standard approach
// Firebase config now loaded from secure Cloudflare Worker
export async function getFirebaseConfig() {
    if (window.firebaseConfigLoader) {
        return await window.firebaseConfigLoader.loadConfig();
    }
    // Fallback for modules that load before firebase-config.js
    const loader = new (await import('../firebase-config.js')).default();
    return await loader.loadConfig();
}



export const CRYPTO_CONFIG = {
    PBKDF2_ITERATIONS: 200000,
    KEY_SIZE: 256 / 32,
    MAX_ATTEMPTS: 3,
    LOCKOUT_TIME: 30 * 1000,
    SESSION_TIMEOUT: 30 * 60 * 1000  // 30 minutes instead of 5
};

