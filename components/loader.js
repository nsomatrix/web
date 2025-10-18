// Global Loader - Manual control only
(function() {
    // Create loader HTML and CSS dynamically
    const loaderCSS = `
        .loading-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8); display: none; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(5px);
        }
        .loading-overlay > div { text-align: center; color: #ff4444; font-family: DOS, Monaco, Menlo, Consolas, "Courier New", monospace; }
        .loading-spinner { width: 60px; height: 60px; margin: 0 auto; }
        .loading-spinner svg { width: 100%; height: 100%; }
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
        </div>
    `;
    document.body.appendChild(loader);
    
    let loadingTimeout;
    
    // Manual loader functions only
    window.showLoading = function() {
        document.getElementById('loading-overlay').style.display = 'flex';
    };
    
    window.hideLoading = function() {
        clearTimeout(loadingTimeout);
        document.getElementById('loading-overlay').style.display = 'none';
    };
    
    // Auto-hide after 5 seconds as safety
    window.showLoadingWithTimeout = function(timeout = 5000) {
        window.showLoading();
        clearTimeout(loadingTimeout);
        loadingTimeout = setTimeout(() => {
            window.hideLoading();
        }, timeout);
    };
})();