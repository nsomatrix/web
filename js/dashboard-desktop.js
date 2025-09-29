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
        const navItems = document.querySelectorAll('.nav-item');
        const cardActions = document.querySelectorAll('.card-action');
        
        // Handle navigation clicks
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                
                // Handle section switching
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });
        
        // Handle card action clicks
        cardActions.forEach(action => {
            action.addEventListener('click', (e) => {
                e.preventDefault();
                const section = action.dataset.section;
                this.switchSection(section);
                
                // Update nav active state
                navItems.forEach(nav => nav.classList.remove('active'));
                const navItem = document.querySelector(`[data-section="${section}"]`);
                if (navItem) {
                    navItem.classList.add('active');
                }
            });
        });
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

    updateStats() {
        // Notes count
        const savedNotes = JSON.parse(localStorage.getItem('savedNotes') || '[]');
        document.getElementById('notesCount').textContent = savedNotes.length;
        
        // Files count
        const fileList = document.getElementById('fileListDisplay');
        const filesCount = fileList ? fileList.children.length : 0;
        document.getElementById('filesCount').textContent = filesCount;
        
        // Passwords count
        const pmEntries = JSON.parse(localStorage.getItem('pmEntries') || '[]');
        document.getElementById('passwordsCount').textContent = pmEntries.length;
        
        // Friends count (placeholder)
        document.getElementById('friendsCount').textContent = '0';
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