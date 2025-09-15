import { CRYPTO_CONFIG } from './config.js';

export function generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

export async function deriveKey(masterPassword, salt) {
    return CryptoJS.PBKDF2(masterPassword, CryptoJS.enc.Hex.parse(salt), {
        keySize: CRYPTO_CONFIG.KEY_SIZE,
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        hasher: CryptoJS.algo.SHA256
    });
}

export function encryptData(dataToEncrypt, encryptionKey) {
    if (!encryptionKey) {
        console.error("Encryption key not available. Cannot encrypt data.");
        return null;
    }
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, encryptionKey, { iv: iv });
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
}

export function decryptData(encryptedData, encryptionKey) {
    if (!encryptionKey) {
        return null;
    }
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) throw new Error("Invalid encrypted data format.");
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const ciphertext = parts[1];

        const decrypted = CryptoJS.AES.decrypt(ciphertext, encryptionKey, { iv: iv });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
}