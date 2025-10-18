// Shared utilities to eliminate code duplication
export function sanitizeInput(input) {
    if (!input) return '';
    return input.replace(/[<>"'&]/g, function(match) {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        }[match];
    });
}

export function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
}

export function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
}

export function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'Mobile';
    if (/Tablet|iPad/.test(ua)) return 'Tablet';
    return 'Desktop';
}

export function createModal(content, className = '') {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;';
    modal.className = className;
    modal.innerHTML = content;
    document.body.appendChild(modal);
    return modal;
}

export function showConfirmModal(title, message, confirmText, cancelText, onConfirm) {
    const modal = createModal(`
        <div style="background:#1a1a1a;color:white;padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);border:1px solid #333;">
            <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:white;">${title}</h3>
            <p style="margin:0 0 24px 0;color:#ccc;line-height:1.5;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button class="cancel-btn" style="background:#2d2d2d;color:#ccc;border:1px solid #555;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${cancelText}</button>
                <button class="confirm-btn" style="background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">${confirmText}</button>
            </div>
        </div>
    `);
    
    modal.querySelector('.cancel-btn').onclick = () => modal.remove();
    modal.querySelector('.confirm-btn').onclick = () => {
        modal.remove();
        onConfirm();
    };
    
    return modal;
}
