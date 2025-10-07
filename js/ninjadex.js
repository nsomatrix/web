class Ninjadex {
    constructor() {
        this.monsters = [];
        this.filteredMonsters = [];
        this.maps = [];
        this.filteredMaps = [];
        this.init();
    }

    async init() {
        await this.loadMonsters();
        this.processMaps();
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

        this.setupCustomSelect('typeFilter', () => this.filterMonsters());
        this.setupCustomSelect('tierFilter', () => this.filterMonsters());
        this.setupCustomSelect('mapTypeFilter', () => this.filterMaps());

        // Maps search
        document.getElementById('mapSearchInput').addEventListener('input', () => {
            this.filterMaps();
        });

        // Planner
        document.getElementById('generatePlan').addEventListener('click', () => {
            this.generateTrainingPlan();
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select')) {
                document.querySelectorAll('.custom-select').forEach(select => {
                    select.classList.remove('open');
                });
            }
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
        
        // Load maps data when maps tab is opened
        if (tabName === 'maps' && this.maps.length > 0) {
            this.renderMaps();
        }
    }

    setupCustomSelect(selectId, callback) {
        const select = document.getElementById(selectId);
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.select-option');

        trigger.addEventListener('click', () => {
            // Close other dropdowns
            document.querySelectorAll('.custom-select').forEach(s => {
                if (s !== select) s.classList.remove('open');
            });
            select.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                // Update active state
                options.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Update trigger text
                trigger.textContent = option.textContent;
                
                // Store selected value
                select.dataset.value = option.dataset.value;
                
                // Close dropdown
                select.classList.remove('open');
                
                // Execute callback
                if (callback) callback();
            });
        });
    }

    filterMonsters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').dataset.value || 'all';
        const tierFilter = document.getElementById('tierFilter').dataset.value || 'all';

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

    processMaps() {
        const mapData = new Map();
        
        this.monsters.forEach(monster => {
            monster.locations.forEach(location => {
                if (!mapData.has(location)) {
                    mapData.set(location, {
                        name: location,
                        type: this.getMapType(location),
                        monsters: []
                    });
                }
                mapData.get(location).monsters.push(monster);
            });
        });
        
        this.maps = Array.from(mapData.values()).sort((a, b) => a.name.localeCompare(b.name));
        this.filteredMaps = [...this.maps];
    }

    getMapType(mapName) {
        const cursedKeywords = ['death', 'nightmare', 'horror', 'skeleton', 'cannibal', 'dread', 'heartbreak', 'suicide', 'secrets'];
        const lowerName = mapName.toLowerCase();
        return cursedKeywords.some(keyword => lowerName.includes(keyword)) ? 'cursed' : 'regular';
    }

    filterMaps() {
        const searchTerm = document.getElementById('mapSearchInput').value.toLowerCase();
        const typeFilter = document.getElementById('mapTypeFilter').dataset.value || 'all';

        this.filteredMaps = this.maps.filter(map => {
            const matchesSearch = map.name.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || map.type === typeFilter;
            return matchesSearch && matchesType;
        });

        this.renderMaps();
    }

    renderMaps() {
        const grid = document.getElementById('mapsGrid');
        grid.innerHTML = '';

        this.filteredMaps.forEach(map => {
            const card = this.createMapCard(map);
            grid.appendChild(card);
        });
    }

    createMapCard(map) {
        const card = document.createElement('div');
        card.className = 'map-card';

        const levelRange = this.getMapLevelRange(map.monsters);
        const monsterCount = map.monsters.length;

        card.innerHTML = `
            <div class="map-header">
                <div class="map-name">${map.name}</div>
                <div class="map-type ${map.type}">${map.type.toUpperCase()}</div>
            </div>
            
            <div class="map-stats">
                <div class="stat-item">
                    <span class="stat-label">Monsters:</span>
                    <span class="stat-value">${monsterCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Level Range:</span>
                    <span class="stat-value">${levelRange.min}-${levelRange.max}</span>
                </div>
            </div>
            
            <div class="map-monsters">
                <div class="monsters-label">Monsters Found Here:</div>
                <div class="monsters-list">
                    ${map.monsters.map(monster => `
                        <div class="monster-item">
                            <span class="monster-item-name">${monster.name}</span>
                            <span class="monster-item-stats">Lv.${monster.level} | ${this.formatNumber(monster.hp)} HP</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        return card;
    }

    getMapLevelRange(monsters) {
        const levels = monsters.map(m => m.level);
        return {
            min: Math.min(...levels),
            max: Math.max(...levels)
        };
    }

    formatNumber(num) {
        return num.toLocaleString();
    }
}

// Initialize Ninjadex when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Ninjadex();
});