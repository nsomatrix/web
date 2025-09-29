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
        // Stats removed
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