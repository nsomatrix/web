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
        this.setRandomLevel();
    }

    setRandomLevel() {
        const randomLevel = Math.floor(Math.random() * 130) + 1;
        document.getElementById('ninjaLevel').placeholder = randomLevel.toString();
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
        this.setupCustomSelect('objective', null);

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
                    <span class="stat-value" style="color: #ffa500;">${this.formatNumber(monster.hp)}</span>
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
        const objective = document.getElementById('objective').dataset.value || 'kins';

        if (!ninjaLevel || ninjaLevel < 1 || ninjaLevel > 130) {
            alert('Please enter a valid ninja level (1-130)');
            return;
        }

        const blueprint = this.generateBluePrint(ninjaLevel, objective);
        this.renderBluePrint(blueprint);
    }

    generateBluePrint(ninjaLevel, objective) {
        const levelRange = { min: ninjaLevel - 7, max: ninjaLevel + 7 };
        
        // Get monsters within ±7 levels
        let suitableMonsters = this.monsters.filter(monster => 
            monster.level >= levelRange.min && monster.level <= levelRange.max
        );

        // Apply objective-specific filtering
        if (objective === 'kins') {
            // For kins: prefer regular monsters, but include cursed for level 107+
            if (ninjaLevel >= 107) {
                // High level players can farm kins from cursed land too
                // No type filtering needed, both regular and cursed are good
            } else {
                // Lower level players stick to regular monsters
                suitableMonsters = suitableMonsters.filter(m => m.type === 'regular');
            }
            if (ninjaLevel >= 40) {
                suitableMonsters = suitableMonsters.filter(m => m.level <= ninjaLevel - 2);
            }
        } else if (objective === 'level') {
            // For leveling: prefer cursed monsters for better exp
            const cursedMonsters = suitableMonsters.filter(m => m.type === 'cursed');
            if (cursedMonsters.length > 0) {
                suitableMonsters = cursedMonsters;
            }
        }

        // Sort by efficiency
        suitableMonsters.sort((a, b) => {
            const aScore = this.calculateEfficiencyScore(a, ninjaLevel, objective);
            const bScore = this.calculateEfficiencyScore(b, ninjaLevel, objective);
            return bScore - aScore;
        });

        // Group by maps for better organization
        const mapGroups = this.groupMonstersByMaps(suitableMonsters.slice(0, 10));
        
        return {
            objective,
            ninjaLevel,
            mapGroups,
            totalMonsters: suitableMonsters.length
        };
    }

    calculateEfficiencyScore(monster, ninjaLevel, objective) {
        const levelDiff = Math.abs(monster.level - ninjaLevel);
        let score = 100 - (levelDiff * 5); // Base score decreases with level difference
        
        if (objective === 'kins') {
            // For kins: prefer regular monsters, but cursed is good for 107+ players
            if (ninjaLevel >= 107) {
                // Both regular and cursed are good for high-level kins farming
                if (monster.type === 'regular') score += 15;
                if (monster.type === 'cursed') score += 18;
            } else {
                // Lower levels prefer regular monsters only
                if (monster.type === 'regular') score += 20;
            }
            if (monster.level <= ninjaLevel) score += 10;
        } else if (objective === 'level') {
            // For leveling: prefer cursed monsters, similar or higher levels
            if (monster.type === 'cursed') score += 30;
            if (monster.level >= ninjaLevel) score += 15;
        }
        
        return Math.max(0, score);
    }

    groupMonstersByMaps(monsters) {
        const mapGroups = new Map();
        
        monsters.forEach(monster => {
            monster.locations.forEach(location => {
                if (!mapGroups.has(location)) {
                    mapGroups.set(location, {
                        mapName: location,
                        monsters: [],
                        mapType: this.getMapType(location)
                    });
                }
                mapGroups.get(location).monsters.push(monster);
            });
        });
        
        return Array.from(mapGroups.values())
            .sort((a, b) => b.monsters.length - a.monsters.length)
            .slice(0, 5);
    }

    renderBluePrint(blueprint) {
        const container = document.getElementById('recommendedMonsters');
        container.innerHTML = '';

        if (blueprint.mapGroups.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No suitable monsters found for your level and objective.</p>';
            document.getElementById('planResults').style.display = 'block';
            return;
        }

        // Add objective summary
        const summary = document.createElement('div');
        summary.className = 'blueprint-summary';
        summary.innerHTML = `
            <div class="summary-text">
                <strong>Objective:</strong> ${blueprint.objective === 'kins' ? 'Farm Kins (Regular Maps Recommended)' : 'Boost Level (Cursed Land Recommended)'}<br>
                <strong>Level Range:</strong> ${blueprint.ninjaLevel - 7} - ${blueprint.ninjaLevel + 7} (±7 from your level)
            </div>
        `;
        container.appendChild(summary);

        // Render map groups
        blueprint.mapGroups.forEach(mapGroup => {
            const mapCard = document.createElement('div');
            mapCard.className = 'blueprint-map';
            
            mapCard.innerHTML = `
                <div class="blueprint-map-header">
                    <span class="blueprint-map-name">${mapGroup.mapName}</span>
                    <span class="blueprint-map-type ${mapGroup.mapType}">${mapGroup.mapType.toUpperCase()}</span>
                </div>
                <div class="blueprint-monsters">
                    ${mapGroup.monsters.map(monster => `
                        <div class="blueprint-monster">
                            <span class="blueprint-monster-name">${monster.name}</span>
                            <span class="blueprint-monster-stats">Lv.${monster.level} | <span style="color: #ffa500;">${this.formatNumber(monster.hp)} HP</span></span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(mapCard);
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
                            <span class="monster-item-stats">Lv.${monster.level} | <span style="color: #ffa500;">${this.formatNumber(monster.hp)} HP</span></span>
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
        return num.toString();
    }
}

// Initialize Ninjadex when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Ninjadex();
});