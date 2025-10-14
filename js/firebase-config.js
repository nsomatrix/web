// Firebase configuration loader
class FirebaseConfigLoader {
    constructor() {
        this.config = null;
        this.workerUrl = 'https://auth-proxy.nsomtx.workers.dev';
    }

    async loadConfig() {
        try {
            const response = await fetch(`${this.workerUrl}/firebase-config`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.config = await response.json();
            console.log('Firebase config loaded successfully from worker');
            return this.config;
        } catch (error) {
            console.warn('Firebase config load error, using fallback:', error.message);
            // Fallback to default config
            this.config = {
                apiKey: 'AIzaSyDp8p_wgeKO_WJAyewYiZhc3en7kF6RXs0',
                authDomain: 'nsomatrix-web.firebaseapp.com',
                projectId: 'nsomatrix-web',
                storageBucket: 'nsomatrix-web.firebasestorage.app',
                messagingSenderId: '320519296982',
                appId: '1:320519296982:web:8c2f95bc7df5650ab13677',
                measurementId: 'G-Z31Z0DPQSC'
            };
            return this.config;
        }
    }

    getConfig() {
        return this.config;
    }
}

// Global instance
window.firebaseConfigLoader = new FirebaseConfigLoader();