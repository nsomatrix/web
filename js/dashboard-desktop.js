// Desktop Dashboard Enhancement Script
class DesktopDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupStats();
        this.setupResponsive();
    }

    setupNavigation() {
        // No navigation needed for card-only layout
    }

    switchSection(section) {
        switch(section) {
            case 'overview':
                // Already showing overview
                break;
            case 'server':
                document.getElementById('serverBtn')?.click();
                break;
            case 'notes':
                document.getElementById('notesBtn')?.click();
                break;
            case 'passwords':
                document.getElementById('passwordManagerBtn')?.click();
                break;
            case 'files':
                document.getElementById('ephemeralFilesBtn')?.click();
                break;
            case 'friends':
                document.getElementById('friendsBtn')?.click();
                break;
        }
    }

    setupStats() {
        // Update stats counters
        this.updateStats();
        
        // Update stats periodically
        setInterval(() => {
            this.updateStats();
        }, 30000); // Update every 30 seconds
    }

    async updateStats() {
        try {
            // Get auth manager from global scope
            if (typeof authManager === 'undefined' || !authManager?.currentUser) {
                return;
            }
            
            // Notes count from Firestore
            const notesSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('notes').get();
            document.getElementById('notesCount').textContent = notesSnapshot.size;
            
            // Passwords count from Firestore
            const passwordsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('passwords').get();
            document.getElementById('passwordsCount').textContent = passwordsSnapshot.size;
            
            // Friends count from Firestore
            const friendsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('friends').where('status', '==', 'accepted').get();
            document.getElementById('friendsCount').textContent = friendsSnapshot.size;
            
            // Files count from Supabase (placeholder for now)
            document.getElementById('filesCount').textContent = '0';
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    setupResponsive() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        this.handleResize();
    }

    handleResize() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        const main = document.querySelector('.dashboard-main');
        
        if (window.innerWidth <= 768) {
            // Mobile view - hide sidebar
            if (sidebar) sidebar.style.display = 'none';
        } else {
            // Desktop view - show sidebar
            if (sidebar) sidebar.style.display = 'flex';
        }
    }
}

// Initialize desktop dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DesktopDashboard();
});

// Export for use in other scripts
window.DesktopDashboard = DesktopDashboard;