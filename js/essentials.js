// essentials.js - Industry standard async loading
(function() {
    'use strict';
    
    // Cache for loaded content
    const cache = new Map();
    
    // Preload critical resources in parallel
    async function loadComponent(url) {
        if (cache.has(url)) return cache.get(url);
        
        try {
            const response = await fetch(url);
            const content = await response.text();
            cache.set(url, content);
            return content;
        } catch (err) {
            console.warn(`Failed to load ${url}:`, err);
            return '';
        }
    }
    
    // Load script with promise
    function loadScript(src) {
        return new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = resolve; // Don't fail, just continue
            document.head.appendChild(script);
        });
    }
    
    // Initialize all components
    async function init() {
        try {
            // No components to load
            
        } catch (error) {
            console.error('Component initialization failed:', error);
        }
    }
    
    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
