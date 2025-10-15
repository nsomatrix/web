// Global Loader - Auto-initializes and intercepts all API calls
(function() {
    // Create loader HTML and CSS dynamically
    const loaderCSS = `
        .loading-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8); display: none; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(5px);
        }
        .loading-overlay > div { text-align: center; color: #ff4444; font-family: 'Courier New', monospace; }
        .loading-spinner { width: 60px; height: 60px; margin: 0 auto 20px; }
        .loading-spinner svg { width: 100%; height: 100%; }
        .loading-text { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    `;
    
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = loaderCSS;
    document.head.appendChild(style);
    
    // Create loader HTML
    const loader = document.createElement('div');
    loader.id = 'loading-overlay';
    loader.className = 'loading-overlay';
    loader.innerHTML = `
        <div>
            <div class="loading-spinner">
                <svg viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#ff4444" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                        <animateTransform attributeName="transform" dur="2s" type="rotate" repeatCount="indefinite" from="0 25 25" to="360 25 25"/>
                        <animate attributeName="stroke-dasharray" dur="1.5s" repeatCount="indefinite" values="0 31.416;15.708 15.708;0 31.416"/>
                    </circle>
                </svg>
            </div>
            <div class="loading-text" id="loading-text">Loading</div>
        </div>
    `;
    document.body.appendChild(loader);
    
    // Global functions
    window.showLoading = function(text = 'Loading') {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').style.display = 'flex';
    };
    
    window.hideLoading = function() {
        document.getElementById('loading-overlay').style.display = 'none';
    };
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        let text = 'Loading';
        if (typeof url === 'string') {
            if (url.includes('firebase')) text = 'Loading Firebase data';
            else if (url.includes('cloudflare')) text = 'Loading Cloudflare data';
            else if (url.includes('.json')) text = 'Loading JSON data';
            else if (url.includes('api')) text = 'Loading API data';
        }
        window.showLoading(text);
        return originalFetch.apply(this, args).finally(() => {
            setTimeout(() => window.hideLoading(), 300);
        });
    };
    
    // Intercept XMLHttpRequest
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
        window.showLoading('Loading data');
        this.addEventListener('loadend', () => {
            setTimeout(() => window.hideLoading(), 300);
        });
        return originalXHRSend.apply(this, args);
    };
})();