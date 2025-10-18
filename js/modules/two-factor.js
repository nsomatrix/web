export class TwoFactorAuth {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }

    async requiresTwoFactor(user) {
        try {
            const doc = await this.db.collection('players').doc(user.uid).get();
            const data = doc.data() || {};
            return data.authenticatorEnabled;
        } catch (error) {
            return false;
        }
    }

    async verifyTwoFactor(user) {
        const requires2FA = await this.requiresTwoFactor(user);
        if (!requires2FA) return true;

        return new Promise((resolve) => {
            this.show2FAModal(user, resolve);
        });
    }

    async show2FAModal(user, resolve) {
        const doc = await this.db.collection('players').doc(user.uid).get();
        const data = doc.data() || {};
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10002;display:flex;align-items:center;justify-content:center;';
        
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:40px;border-radius:16px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#00d4ff;margin-bottom:30px;">🔐 Two-Factor Authentication</h3>
                <p style="color:#ccc;margin-bottom:30px;">Choose your verification method:</p>
                
                ${data.authenticatorEnabled ? `
                    <button id="useAuthenticatorBtn" style="background:linear-gradient(135deg,#007bff,#0056b3);color:white;border:none;padding:15px 30px;border-radius:8px;cursor:pointer;margin:10px;width:100%;font-weight:600;">
                        📱 Use Authenticator App
                    </button>
                ` : ''}
                
                <button id="useMagicLinkBtn" style="background:linear-gradient(135deg,#ffc107,#e0a800);color:white;border:none;padding:15px 30px;border-radius:8px;cursor:pointer;margin:10px;width:100%;font-weight:600;">
                    ✉️ Send Magic Link
                </button>
                
                <div id="authCodeSection" style="display:none;margin-top:20px;">
                    <input type="text" id="authCodeInput" placeholder="Enter 6-digit code" style="background:#2d2d2d;color:white;border:1px solid #555;padding:12px;width:150px;text-align:center;border-radius:8px;" maxlength="6" />
                    <br><br>
                    <button id="verifyCodeBtn" style="background:#28a745;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">Verify Code</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Authenticator verification
        if (data.authenticatorEnabled) {
            document.getElementById('useAuthenticatorBtn').onclick = () => {
                document.getElementById('authCodeSection').style.display = 'block';
                document.getElementById('verifyCodeBtn').onclick = async () => {
                    const code = document.getElementById('authCodeInput').value.trim();
                    if (await this.verifyTOTP(data.totpSecret, code)) {
                        modal.remove();
                        resolve(true);
                    } else {
                        this.showError('Invalid code');
                    }
                };
            };
        }
        
        // Magic link fallback
        document.getElementById('useMagicLinkBtn').onclick = async () => {
            await this.sendMagicLink(user.email);
            modal.innerHTML = `
                <div style="background:#1a1a1a;color:white;padding:40px;border-radius:16px;max-width:400px;text-align:center;border:1px solid #333;">
                    <h3 style="color:#00d4ff;margin-bottom:20px;">📧 Magic Link Sent</h3>
                    <p style="color:#ccc;margin-bottom:30px;">Check your email and click the verification link to continue.</p>
                    <button onclick="this.parentElement.parentElement.remove();window.location.reload();" style="background:#6c757d;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">Cancel</button>
                </div>
            `;
        };
    }

    async sendMagicLink(email) {
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/dashboard.html?verified=true`,
                handleCodeInApp: true
            };
            
            await this.auth.sendSignInLinkToEmail(email, actionCodeSettings);
            sessionStorage.setItem('emailForSignIn', email);
            window.showMessageBox('Magic link sent to your email', 'success', 3000);
        } catch (error) {
            this.showError('Failed to send magic link');
        }
    }

    async verifyTOTP(secret, token) {
        const timeWindow = Math.floor(Date.now() / 1000 / 30);
        for (let i = -1; i <= 1; i++) {
            const expectedToken = await this.generateTOTP(secret, timeWindow + i);
            if (expectedToken === token) return true;
        }
        return false;
    }

    async generateTOTP(secret, timeWindow) {
        const key = this.base32ToBytes(secret);
        const time = new ArrayBuffer(8);
        const timeView = new DataView(time);
        timeView.setUint32(4, timeWindow, false);
        
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, time);
        const hmac = new Uint8Array(signature);
        
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
        
        return (code % 1000000).toString().padStart(6, '0');
    }

    base32ToBytes(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (let char of base32.toUpperCase()) {
            if (alphabet.indexOf(char) === -1) continue;
            bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            if (bits.substr(i, 8).length === 8) {
                bytes.push(parseInt(bits.substr(i, 8), 2));
            }
        }
        return new Uint8Array(bytes);
    }



    showError(message) {
        window.showMessageBox(message, 'error', 3000);
    }
}