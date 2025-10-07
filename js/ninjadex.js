class Ninjadex {
    constructor() {
        this.monsters = [];
        this.filteredMonsters = [];
        this.init();
    }

    async init() {
        await this.loadMonsters();
        this.setupEventListeners();
        this.updateStats();
        this.renderMonsters();
    }

    async loadMonsters() {
        try {
            const response = await fetch('json/monsters_database.json');
            const data = await response.json();
            this.monsters = [...data.monsters.regular, ...data.monsters.cursed];
            this.filteredMonsters = [...this.monsters];
        } catch (error) {
            console.error('Failed to load monsters:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterMonsters();
        });

        document.getElementById('typeFilter').addEventListener('change', () => {
            this.filterMonsters();
        });

        document.getElementById('tierFilter').addEventListener('change', () => {
            this.filterMonsters();
        });

        // Planner
        document.getElementById('generatePlan').addEventListener('click', () => {
            this.generateTrainingPlan();
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    filterMonsters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const tierFilter = document.getElementById('tierFilter').value;

        this.filteredMonsters = this.monsters.filter(monster => {
            // Search filter
            const matchesSearch = monster.name.toLowerCase().includes(searchTerm) ||
                                monster.locations.some(loc => loc.toLowerCase().includes(searchTerm));

            // Type filter
            const matchesType = typeFilter === 'all' || monster.type === typeFilter;

            // Tier filter
            const matchesTier = tierFilter === 'all' || monster.metadata.difficulty_tier === tierFilter;

            return matchesSearch && matchesType && matchesTier;
        });

        this.updateStats();
        this.renderMonsters();
    }

    updateStats() {
        const total = this.filteredMonsters.length;
        const regular = this.filteredMonsters.filter(m => m.type === 'regular').length;
        const cursed = this.filteredMonsters.filter(m => m.type === 'cursed').length;

        document.getElementById('totalMonsters').textContent = total;
        document.getElementById('regularCount').textContent = regular;
        document.getElementById('cursedCount').textContent = cursed;
    }

    renderMonsters() {
        const grid = document.getElementById('monstersGrid');
        grid.innerHTML = '';

        this.filteredMonsters.forEach(monster => {
            const card = this.createMonsterCard(monster);
            grid.appendChild(card);
        });
    }

    createMonsterCard(monster) {
        const card = document.createElement('div');
        card.className = 'monster-card';

        card.innerHTML = `
            <div class="monster-header">
                <div class="monster-name">${monster.name}</div>
                <div class="monster-type ${monster.type}">${monster.type.toUpperCase()}</div>
            </div>
            
            <div class="difficulty-tier ${monster.metadata.difficulty_tier}">
                ${monster.metadata.difficulty_tier.toUpperCase()}
            </div>
            
            <div class="monster-stats">
                <div class="stat-item">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${monster.level}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">HP:</span>
                    <span class="stat-value">${this.formatNumber(monster.hp)}</span>
                </div>
            </div>
            
            <div class="monster-locations">
                <div class="locations-label">Found in:</div>
                <div class="locations-list">
                    ${monster.locations.map(loc => `<span class="location-tag">${loc}</span>`).join('')}
                </div>
            </div>
        `;

        return card;
    }

    generateTrainingPlan() {
        const ninjaLevel = parseInt(document.getElementById('ninjaLevel').value);
        const targetLevel = parseInt(document.getElementById('targetLevel').value);

        if (!ninjaLevel || !targetLevel || ninjaLevel >= targetLevel) {
            alert('Please enter valid ninja and target levels');
            return;
        }

        const recommendations = this.getTrainingRecommendations(ninjaLevel, targetLevel);
        this.renderTrainingPlan(recommendations);
    }

    getTrainingRecommendations(ninjaLevel, targetLevel) {
        const recommendations = [];
        
        // Find monsters suitable for the level range
        const suitableMonsters = this.monsters.filter(monster => {
            const levelDiff = Math.abs(monster.level - ninjaLevel);
            return levelDiff <= 10 && monster.level <= targetLevel + 5;
        });

        // Sort by level and efficiency
        suitableMonsters.sort((a, b) => {
            const aDiff = Math.abs(a.level - ninjaLevel);
            const bDiff = Math.abs(b.level - ninjaLevel);
            return aDiff - bDiff;
        });

        // Group by level ranges
        const levelRanges = [
            { min: ninjaLevel, max: ninjaLevel + 5, label: 'Early Training' },
            { min: ninjaLevel + 5, max: ninjaLevel + 10, label: 'Mid Training' },
            { min: ninjaLevel + 10, max: targetLevel, label: 'Advanced Training' }
        ];

        levelRanges.forEach(range => {
            if (range.max > ninjaLevel) {
                const monstersInRange = suitableMonsters.filter(m => 
                    m.level >= range.min && m.level <= range.max
                ).slice(0, 3);

                monstersInRange.forEach(monster => {
                    recommendations.push({
                        monster,
                        phase: range.label,
                        reason: this.getTrainingReason(monster, ninjaLevel)
                    });
                });
            }
        });

        return recommendations;
    }

    getTrainingReason(monster, ninjaLevel) {
        const levelDiff = monster.level - ninjaLevel;
        
        if (levelDiff <= 0) {
            return 'Good for safe training and resource farming';
        } else if (levelDiff <= 3) {
            return 'Optimal experience gain with manageable difficulty';
        } else if (levelDiff <= 7) {
            return 'Challenging but rewarding for faster progression';
        } else {
            return 'High-risk, high-reward training for experienced ninjas';
        }
    }

    renderTrainingPlan(recommendations) {
        const container = document.getElementById('recommendedMonsters');
        container.innerHTML = '';

        if (recommendations.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No suitable monsters found for your level range.</p>';
            document.getElementById('planResults').style.display = 'block';
            return;
        }

        recommendations.forEach(rec => {
            const item = document.createElement('div');
            item.className = 'recommended-monster';

            item.innerHTML = `
                <div class="recommended-info">
                    <div class="recommended-name">${rec.monster.name}</div>
                    <div class="recommended-reason">${rec.phase}: ${rec.reason}</div>
                </div>
                <div class="recommended-stats">
                    Level ${rec.monster.level}<br>
                    HP: ${this.formatNumber(rec.monster.hp)}
                </div>
            `;

            container.appendChild(item);
        });

        document.getElementById('planResults').style.display = 'block';
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Initialize Ninjadex when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Ninjadex();
});