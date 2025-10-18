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
                    const verifyBtn = document.getElementById('verifyCodeBtn');
                    
                    if (!/^\d{6}$/.test(code)) {
                        this.showError('Please enter a valid 6-digit code');
                        return;
                    }
                    
                    verifyBtn.disabled = true;
                    verifyBtn.textContent = 'Verifying...';
                    
                    try {
                        const isValid = await this.verifyTOTP(data.totpSecret, code);
                        if (isValid) {
                            modal.remove();
                            resolve(true);
                        } else {
                            this.showError('Invalid code. Please check your authenticator app and try again.');
                        }
                    } catch (error) {
                        console.error('2FA verification error:', error);
                        this.showError('Verification failed. Please try again.');
                    } finally {
                        verifyBtn.disabled = false;
                        verifyBtn.textContent = 'Verify Code';
                    }
                };
            };
        }
        
        // Magic link fallback
        document.getElementById('useMagicLinkBtn').onclick = async () => {
            await this.sendMagicLink(user.email);
            this.showEmailCodeModal(modal, resolve);
        };
    }

    async sendMagicLink(email) {
        try {
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = Date.now() + 10 * 60 * 1000;
            
            await this.db.collection('emailVerifications').doc(this.auth.currentUser.uid).set({
                code: verificationCode,
                expiry: expiry,
                used: false,
                email: email
            });
            
            // Send email via Resend
            const response = await fetch('https://resend-proxy.nsomtx.workers.dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: email, code: verificationCode })
            });
            
            if (response.ok) {
                if (window.showMessageBox) {
                    window.showMessageBox('Verification code sent to your email', 'success', 3000);
                }
            } else {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            console.error('Send magic link error:', error);
            this.showError('Failed to send verification email: ' + error.message);
        }
    }
    
    async sendGmailMessage(to, code) {
        return new Promise((resolve, reject) => {
            this.getGmailConfig().then(config => {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: config.clientId,
                    scope: 'https://www.googleapis.com/auth/gmail.send',
                    callback: async (response) => {
                        try {
                            if (response.access_token) {
                                const emailResponse = await fetch('https://gmail-proxy.nsomtx.workers.dev/send-email', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ to, code, accessToken: response.access_token })
                                });
                                
                                if (emailResponse.ok) {
                                    resolve();
                                } else {
                                    throw new Error('Failed to send email');
                                }
                            } else {
                                throw new Error('No access token received');
                            }
                        } catch (error) {
                            console.error('Gmail API error:', error);
                            reject(error);
                        }
                    }
                });
                
                tokenClient.requestAccessToken();
            }).catch(reject);
        });
    }
    
    async getGmailConfig() {
        const response = await fetch('https://gmail-proxy.nsomtx.workers.dev/gmail-config');
        return await response.json();
    }

    async verifyTOTP(secret, token) {
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

    async generateTOTP(secret, timeWindow) {
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

    base32ToBytes(base32) {
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



    showEmailCodeModal(originalModal, resolve) {
        originalModal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:40px;border-radius:16px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#00d4ff;margin-bottom:20px;">📧 Email Verification</h3>
                <p style="color:#ccc;margin-bottom:20px;">Enter the 6-digit code sent to your email:</p>
                <input type="text" id="emailCodeInput" placeholder="Enter 6-digit code" style="background:#2d2d2d;color:white;border:1px solid #555;padding:12px;width:150px;text-align:center;border-radius:8px;margin:10px 0;" maxlength="6" />
                <br>
                <button id="verifyEmailCodeBtn" style="background:#28a745;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Verify Code</button>
                <button onclick="this.parentElement.parentElement.remove();" style="background:#6c757d;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin:5px;">Cancel</button>
            </div>
        `;
        
        document.getElementById('verifyEmailCodeBtn').onclick = async () => {
            const enteredCode = document.getElementById('emailCodeInput').value.trim();
            if (await this.verifyEmailCode(enteredCode)) {
                originalModal.remove();
                resolve(true);
            } else {
                this.showError('Invalid or expired code');
            }
        };
    }
    
    async verifyEmailCode(code) {
        try {
            const doc = await this.db.collection('emailVerifications').doc(this.auth.currentUser.uid).get();
            if (!doc.exists) return false;
            
            const data = doc.data();
            if (data.used || Date.now() > data.expiry) return false;
            if (data.code !== code) return false;
            
            // Mark as used
            await doc.ref.update({ used: true });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    showError(message) {
        if (window.showMessageBox) {
            window.showMessageBox(message, 'error', 3000);
        } else {
            alert(message);
        }
    }
}