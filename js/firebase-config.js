// Firebase configuration loader
class FirebaseConfigLoader {
    constructor() {
        this.config = null;
        this.workerUrl = 'https://auth-proxy.nsomtx.workers.dev';
    }

    async loadConfig() {
        try {
            const response = await fetch(`${this.workerUrl}/firebase-config`);
            if (!response.ok) {
                throw new Error('Failed to load Firebase config');
            }
            this.config = await response.json();
            return this.config;
        } catch (error) {
            console.error('Firebase config load error:', error);
            // Fallback to default config (you can remove this after migration)
            return {
                apiKey: 'AIzaSyDp8p_wgeKO_WJAyewYiZhc3en7kF6RXs0',
                authDomain: 'nsomatrix-web.firebaseapp.com',
                projectId: 'nsomatrix-web',
                storageBucket: 'nsomatrix-web.firebasestorage.app',
                messagingSenderId: '320519296982',
                appId: '1:320519296982:web:8c2f95bc7df5650ab13677',
                measurementId: 'G-Z31Z0DPQSC'
            };
        }
    }

    getConfig() {
        return this.config;
    }
}

// Global instance
window.firebaseConfigLoader = new FirebaseConfigLoader();