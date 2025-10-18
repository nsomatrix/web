// Shared TOTP implementation to eliminate duplication
export class TOTPManager {
    static generateSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    static generateQRCodeURL(secret, issuer = 'NSO Matrix', accountName) {
        const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
    }

    static async verifyTOTP(secret, token) {
        try {
            if (!secret || !token || token.length !== 6) {
                return false;
            }
            
            const timeWindow = Math.floor(Date.now() / 1000 / 30);
            
            // Check current time window and adjacent windows for clock drift
            for (let i = -2; i <= 2; i++) {
                const expectedToken = await this.generateTOTP(secret, timeWindow + i);
                if (expectedToken === token) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('TOTP verification error:', error);
            return false;
        }
    }

    static async generateTOTP(secret, timeWindow) {
        try {
            const key = this.base32ToBytes(secret);
            if (!key || key.length === 0) {
                throw new Error('Invalid secret key');
            }
            
            const time = new ArrayBuffer(8);
            const timeView = new DataView(time);
            timeView.setUint32(4, timeWindow, false);
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw', 
                key, 
                { name: 'HMAC', hash: 'SHA-1' }, 
                false, 
                ['sign']
            );
            
            const signature = await crypto.subtle.sign('HMAC', cryptoKey, time);
            const hmac = new Uint8Array(signature);
            
            const offset = hmac[hmac.length - 1] & 0xf;
            const code = ((hmac[offset] & 0x7f) << 24) | 
                        ((hmac[offset + 1] & 0xff) << 16) | 
                        ((hmac[offset + 2] & 0xff) << 8) | 
                        (hmac[offset + 3] & 0xff);
            
            return (code % 1000000).toString().padStart(6, '0');
        } catch (error) {
            console.error('TOTP generation error:', error);
            throw error;
        }
    }

    static base32ToBytes(base32) {
        try {
            if (!base32 || typeof base32 !== 'string') {
                throw new Error('Invalid base32 input');
            }
            
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
            
            if (cleanBase32.length === 0) {
                throw new Error('Empty base32 string after cleaning');
            }
            
            let bits = '';
            for (let char of cleanBase32) {
                const index = alphabet.indexOf(char);
                if (index === -1) continue;
                bits += index.toString(2).padStart(5, '0');
            }
            
            const bytes = [];
            for (let i = 0; i < bits.length; i += 8) {
                const byte = bits.substring(i, i + 8);
                if (byte.length === 8) {
                    bytes.push(parseInt(byte, 2));
                }
            }
            
            return new Uint8Array(bytes);
        } catch (error) {
            console.error('Base32 decode error:', error);
            throw error;
        }
    }
}
