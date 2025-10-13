// Live Statistics Display
class LiveStats {
    constructor() {
        this.stats = {
            onlineUsers: 0,
            totalVisits: 0,
            serverLoad: 0,
            lastUpdate: new Date()
        };
        this.init();
    }

    init() {
        this.createStatsDisplay();
        this.startStatsUpdater();
    }

    createStatsDisplay() {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'live-stats-container';
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Online</span>
                    <span class="stat-value" id="online-count">--</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Visits</span>
                    <span class="stat-value" id="visit-count">--</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Load</span>
                    <span class="stat-value" id="server-load">--</span>
                </div>
            </div>
        `;

        // Insert after the uptime display
        const uptimeDisplay = document.getElementById('ut');
        if (uptimeDisplay && uptimeDisplay.parentNode) {
            uptimeDisplay.parentNode.insertBefore(statsContainer, uptimeDisplay.nextSibling);
        }
    }

    generateRealisticStats() {
        // Simulate realistic online users (1-50)
        this.stats.onlineUsers = Math.floor(Math.random() * 49) + 1;
        
        // Increment total visits
        this.stats.totalVisits += Math.floor(Math.random() * 3);
        
        // Simulate server load (0-100%)
        this.stats.serverLoad = Math.floor(Math.random() * 30) + 10; // 10-40% typical load
        
        this.stats.lastUpdate = new Date();
    }

    updateDisplay() {
        this.generateRealisticStats();
        
        const onlineElement = document.getElementById('online-count');
        const visitElement = document.getElementById('visit-count');
        const loadElement = document.getElementById('server-load');

        if (onlineElement) {
            onlineElement.textContent = this.stats.onlineUsers;
            onlineElement.style.color = this.stats.onlineUsers > 30 ? '#ff4444' : '#00ff00';
        }

        if (visitElement) {
            visitElement.textContent = this.stats.totalVisits.toLocaleString();
        }

        if (loadElement) {
            loadElement.textContent = this.stats.serverLoad + '%';
            loadElement.style.color = this.stats.serverLoad > 80 ? '#ff4444' : 
                                     this.stats.serverLoad > 50 ? '#ffaa00' : '#00ff00';
        }
    }

    startStatsUpdater() {
        // Initialize with some base values
        this.stats.totalVisits = parseInt(localStorage.getItem('totalVisits')) || Math.floor(Math.random() * 10000) + 5000;
        
        // Update every 5 seconds
        this.updateDisplay();
        setInterval(() => {
            this.updateDisplay();
            localStorage.setItem('totalVisits', this.stats.totalVisits);
        }, 5000);
    }
}

// Add CSS for the stats display
const statsCSS = `
.live-stats-container {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 0, 0, 0.3);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.stat-label {
    color: #ffffff;
    font-family: DOS, Monaco, Menlo, Consolas, "Courier New", monospace;
    font-size: 0.8rem;
    margin-bottom: 2px;
}

.stat-value {
    color: #ff0000;
    font-family: DOS, Monaco, Menlo, Consolas, "Courier New", monospace;
    font-size: 1rem;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
    transition: color 0.3s ease;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
    }
    
    .stat-label {
        font-size: 0.7rem;
    }
    
    .stat-value {
        font-size: 0.9rem;
    }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = statsCSS;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LiveStats();
});