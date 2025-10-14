// Global error suppression for known third-party issues
(function() {
    'use strict';
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // List of error patterns to suppress
    const suppressPatterns = [
        // Cloudflare Turnstile/Beacon errors
        /static\.cloudflareinsights\.com/,
        /challenges\.cloudflare\.com.*turnstile/,
        /Content-Security-Policy.*challenges\.cloudflare\.com/,
        /Cookie.*has been rejected.*cross-site context/,
        /Partitioned cookie.*challenges\.cloudflare\.com/,
        /cspmeta.*has been rejected/,
        /Partitioned cookie or storage access was provided/,
        
        // Firefox deprecation warnings
        /InstallTrigger is deprecated/,
        /onmozfullscreenchange is deprecated/,
        /onmozfullscreenerror is deprecated/,
        /WEBGL_debug_renderer_info is deprecated/,
        
        // Feature Policy warnings
        /Feature Policy.*cross-origin-isolated/,
        /Feature Policy.*autoplay/,
        /Skipping unsupported feature name/,
        
        // Google Analytics blocked by CSP (expected)
        /Content-Security-Policy.*googletagmanager\.com/,
        
        // Private Access Token challenges (normal Cloudflare behavior)
        /Request for the Private Access Token challenge/,
        
        // Character encoding warnings from iframes
        /The character encoding of a framed document was not declared/,
        
        // Preload warnings
        /preloaded with link preload was not used within a few seconds/,
        
        // Empty string logs
        /^\s*$/,
        /^<empty string>$/
    ];
    
    // Override console.error
    console.error = function(...args) {
        const message = args.join(' ');
        
        // Check if this error should be suppressed
        const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
        
        if (!shouldSuppress) {
            originalError.apply(console, args);
        }
    };
    
    // Override console.warn for specific warnings
    console.warn = function(...args) {
        const message = args.join(' ');
        
        // Only suppress very specific warnings
        const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
        
        if (!shouldSuppress) {
            originalWarn.apply(console, args);
        }
    };
    
    // Override console.log to suppress empty strings and specific messages
    const originalLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        
        // Suppress empty logs and specific patterns
        const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message)) || 
                              (args.length === 1 && (args[0] === '' || args[0] === undefined));
        
        if (!shouldSuppress) {
            originalLog.apply(console, args);
        }
    };
    
    // Suppress window errors for known issues
    const originalWindowError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        const errorMessage = message || '';
        const errorSource = source || '';
        
        // Check if this is a known third-party error
        const shouldSuppress = suppressPatterns.some(pattern => 
            pattern.test(errorMessage) || pattern.test(errorSource)
        );
        
        if (!shouldSuppress && originalWindowError) {
            return originalWindowError.call(this, message, source, lineno, colno, error);
        }
        
        return shouldSuppress; // Return true to suppress the error
    };
    
    // Suppress unhandled promise rejections for known issues
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason || '';
        const reasonString = typeof reason === 'string' ? reason : reason.toString();
        
        const shouldSuppress = suppressPatterns.some(pattern => pattern.test(reasonString));
        
        if (shouldSuppress) {
            event.preventDefault();
        }
    });
    
})();