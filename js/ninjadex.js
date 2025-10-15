class Ninjadex {
    constructor() {
        this.monsters = [];
        this.filteredMonsters = [];
        this.maps = [];
        this.filteredMaps = [];
        this.equipments = [];
        this.filteredEquipments = [];
        this.items = [];
        this.filteredItems = [];
        this.skillsets = [];
        this.filteredSkillsets = [];
        this.init();
    }

    async init() {
        await this.loadMonsters();
        await this.loadEquipments();
        await this.loadItems();
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
            this.additionalMaps = data.additional_maps || [];
        } catch (error) {
            console.error('Failed to load monsters:', error);
        }
    }

    async loadEquipments() {
        try {
            const response = await fetch('json/structured_equipment_data.json');
            const data = await response.json();
            this.equipments = [];
            
            // Flatten all equipment categories into a single array
            Object.keys(data.categories).forEach(category => {
                if (category === 'weapons') {
                    // Handle nested weapon structure
                    Object.keys(data.categories.weapons).forEach(weaponType => {
                        data.categories.weapons[weaponType].forEach(item => {
                            this.equipments.push({
                                ...item,
                                category: 'sword', // Keep as 'sword' for filter compatibility
                                weapon_type: weaponType
                            });
                        });
                    });
                } else if (Array.isArray(data.categories[category])) {
                    data.categories[category].forEach(item => {
                        this.equipments.push({
                            ...item,
                            category: category
                        });
                    });
                }
            });
            
            this.filteredEquipments = [...this.equipments];
        } catch (error) {
            console.error('Failed to load equipments:', error);
        }
    }

    async loadItems() {
        try {
            const response = await fetch('data/items.json');
            const data = await response.json();
            this.items = data;
            this.filteredItems = [...this.items];
        } catch (error) {
            console.error('Failed to load items:', error);
        }
    }



    async loadSkillsets() {
        try {
            const response = await fetch('structured_skillsets.json');
            const data = await response.json();
            this.skillsets = [];
            
            Object.keys(data.classes).forEach(className => {
                const classData = data.classes[className];
                classData.skills.forEach(skill => {
                    this.skillsets.push({
                        ...skill,
                        class: className,
                        school: classData.school
                    });
                });
            });
            
            this.filteredSkillsets = [...this.skillsets];
        } catch (error) {
            console.error('Failed to load skillsets:', error);
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
        this.setupCustomSelect('equipmentCategoryFilter', () => this.updateWeaponTypeFilter());
        this.setupCustomSelect('equipmentWeaponTypeFilter', () => this.filterEquipments());
        this.setupCustomSelect('equipmentAttributeFilter', () => this.filterEquipments());
        this.setupCustomSelect('objective', null);

        // Maps search
        document.getElementById('mapSearchInput').addEventListener('input', () => {
            this.filterMaps();
        });

        // Equipment search
        document.getElementById('equipmentSearchInput').addEventListener('input', () => {
            this.filterEquipments();
        });

        // Items search
        document.getElementById('itemSearchInput').addEventListener('input', () => {
            this.filterItems();
        });

        // Skillsets search and filters (only if elements exist)
        const skillsetSearchInput = document.getElementById('skillsetSearchInput');
        if (skillsetSearchInput) {
            skillsetSearchInput.addEventListener('input', () => {
                this.filterSkillsets();
            });
            this.setupCustomSelect('schoolFilter', () => this.filterSkillsets());
            this.setupCustomSelect('classFilter', () => this.filterSkillsets());
            this.setupCustomSelect('skillLevelFilter', () => this.filterSkillsets());
        }

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
            this.updateMapStats();
            this.renderMaps();
        }
        
        // Load equipment data when equipments tab is opened
        if (tabName === 'equipments' && this.equipments.length > 0) {
            this.updateEquipmentStats();
            this.renderEquipments();
        }
        
        // Load items data when items tab is opened
        if (tabName === 'items' && this.items.length > 0) {
            this.updateItemStats();
            this.renderItems();
        }
        
        // Load skillsets data when skillsets tab is opened
        if (tabName === 'skillsets') {
            if (this.skillsets.length === 0) {
                this.loadSkillsets().then(() => {
                    this.updateSkillsetStats();
                    this.renderSkillsets();
                });
            } else {
                this.updateSkillsetStats();
                this.renderSkillsets();
            }
        }
    }

    setupCustomSelect(selectId, callback) {
        const select = document.getElementById(selectId);
        if (!select) return;
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

    updateEquipmentStats() {
        const total = this.filteredEquipments.length;
        document.getElementById('totalEquipments').textContent = total;
    }

    updateMapStats() {
        const total = this.filteredMaps.length;
        document.getElementById('totalMaps').textContent = total;
    }

    updateItemStats() {
        const total = this.filteredItems.length;
        document.getElementById('totalItems').textContent = total;
    }

    updateSkillsetStats() {
        const total = this.filteredSkillsets.length;
        document.getElementById('totalSkills').textContent = total;
    }

    filterSkillsets() {
        const searchTerm = document.getElementById('skillsetSearchInput').value.toLowerCase();
        const schoolFilter = document.getElementById('schoolFilter').dataset.value || 'all';
        const classFilter = document.getElementById('classFilter').dataset.value || 'all';
        const levelFilter = document.getElementById('skillLevelFilter').dataset.value || 'all';

        this.filteredSkillsets = this.skillsets.filter(skill => {
            const matchesSearch = skill.name.toLowerCase().includes(searchTerm) ||
                                skill.description.toLowerCase().includes(searchTerm);
            const matchesSchool = schoolFilter === 'all' || skill.school === schoolFilter;
            const matchesClass = classFilter === 'all' || skill.class === classFilter;
            
            let matchesLevel = true;
            if (levelFilter !== 'all') {
                const [min, max] = levelFilter.split('-').map(Number);
                matchesLevel = skill.level >= min && skill.level <= max;
            }

            return matchesSearch && matchesSchool && matchesClass && matchesLevel;
        });

        this.updateSkillsetStats();
        this.renderSkillsets();
    }

    renderSkillsets() {
        const grid = document.getElementById('skillsetsGrid');
        grid.innerHTML = '';

        this.filteredSkillsets.forEach(skill => {
            const card = this.createSkillCard(skill);
            grid.appendChild(card);
        });
    }

    createSkillCard(skill) {
        const card = document.createElement('div');
        card.className = 'skill-card';

        card.innerHTML = `
            <div class="skill-header">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-level">Level ${skill.level}</div>
            </div>
            
            <div class="skill-class-info">
                <span class="skill-class ${skill.class}">${skill.class.toUpperCase()}</span>
                <span class="skill-school ${skill.school}">${skill.school.toUpperCase()}</span>
            </div>
            
            <div class="skill-description">
                ${skill.description}
            </div>
        `;

        return card;
    }

    filterItems() {
        const searchTerm = document.getElementById('itemSearchInput').value.toLowerCase();
        
        this.filteredItems = this.items.filter(item => {
            return item.name.toLowerCase().includes(searchTerm);
        });

        this.updateItemStats();
        this.renderItems();
    }

    renderItems() {
        const grid = document.getElementById('itemsGrid');
        grid.innerHTML = '';

        this.filteredItems.forEach(item => {
            const card = this.createItemCard(item);
            grid.appendChild(card);
        });
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';

        card.innerHTML = `
            <div class="item-header">
                <div class="item-name">${item.name}</div>
                <div class="item-id">ID: ${item.id}</div>
            </div>
        `;

        return card;
    }

    updateWeaponTypeFilter() {
        const categoryFilter = document.getElementById('equipmentCategoryFilter').dataset.value || 'all';
        const weaponTypeFilter = document.getElementById('equipmentWeaponTypeFilter');
        
        if (categoryFilter === 'sword') {
            weaponTypeFilter.style.display = 'block';
        } else {
            weaponTypeFilter.style.display = 'none';
            weaponTypeFilter.dataset.value = 'all';
            weaponTypeFilter.querySelector('.select-trigger').textContent = 'All Weapon Types';
            weaponTypeFilter.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('active'));
            weaponTypeFilter.querySelector('[data-value="all"]').classList.add('active');
        }
        
        this.filterEquipments();
    }

    filterEquipments() {
        const searchTerm = document.getElementById('equipmentSearchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('equipmentCategoryFilter').dataset.value || 'all';
        const weaponTypeFilter = document.getElementById('equipmentWeaponTypeFilter').dataset.value || 'all';
        const attributeFilter = document.getElementById('equipmentAttributeFilter').dataset.value || 'all';

        this.filteredEquipments = this.equipments.filter(equipment => {
            // Search filter
            const matchesSearch = equipment.name.toLowerCase().includes(searchTerm);

            // Category filter
            const matchesCategory = categoryFilter === 'all' || equipment.category === categoryFilter;

            // Weapon type filter (only for weapons)
            let matchesWeaponType = true;
            if (categoryFilter === 'sword' && weaponTypeFilter !== 'all') {
                matchesWeaponType = equipment.weapon_type === weaponTypeFilter;
            }

            // Attribute filter
            const matchesAttribute = attributeFilter === 'all' || equipment.attribute === attributeFilter;

            return matchesSearch && matchesCategory && matchesWeaponType && matchesAttribute;
        });

        this.updateEquipmentStats();
        this.renderEquipments();
    }

    renderEquipments() {
        const grid = document.getElementById('equipmentsGrid');
        grid.innerHTML = '';

        this.filteredEquipments.forEach(equipment => {
            const card = this.createEquipmentCard(equipment);
            grid.appendChild(card);
        });
    }

    createEquipmentCard(equipment) {
        const card = document.createElement('div');
        card.className = 'equipment-card';

        const upgradesHtml = equipment.upgrades.map(upgrade => 
            `<div class="upgrade-item">
                <span class="upgrade-level" data-level="${upgrade.upgrade_level}">+${upgrade.upgrade_level}</span>
                <span class="upgrade-desc">${upgrade.description.replace(/(\+?\d+%?)/g, '<span class="number">$1</span>')}: <span class="number">${upgrade.value}</span></span>
            </div>`
        ).join('');

        const weaponStats = equipment.type === 'weapon' ? 
            `<div class="weapon-stats">
                <div class="stat-item">
                    <span class="stat-label">External:</span>
                    <span class="stat-value">${equipment.external_strike || 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Internal:</span>
                    <span class="stat-value">${equipment.internal_strike || 'N/A'}</span>
                </div>
            </div>` : '';

        card.innerHTML = `
            <div class="equipment-header">
                <div class="equipment-name">${equipment.name}</div>
                <div class="equipment-type ${equipment.type}">${equipment.type.toUpperCase()}</div>
            </div>
            
            <div class="equipment-category ${equipment.category}">
                ${equipment.type === 'weapon' && equipment.weapon_type ? equipment.weapon_type.toUpperCase() : equipment.category.toUpperCase()}
            </div>
            
            <div class="equipment-stats">
                <div class="stat-item">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${equipment.level}</span>
                </div>
                ${equipment.attribute ? `
                <div class="stat-item">
                    <span class="stat-label ${equipment.attribute.toLowerCase()}">Attribute:</span>
                    <span class="stat-value">${equipment.attribute}</span>
                </div>` : ''}
            </div>
            
            ${weaponStats}
            
            <div class="equipment-upgrades">
                <div class="upgrades-label">Upgrades:</div>
                <div class="upgrades-list">
                    ${upgradesHtml}
                </div>
            </div>
        `;

        return card;
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
        const button = document.getElementById('generatePlan');

        if (!ninjaLevel || ninjaLevel < 1 || ninjaLevel > 130) {
            alert('Please enter a valid ninja level (1-130)');
            return;
        }

        // Show loading state
        button.classList.add('loading');
        
        // Simulate processing time
        setTimeout(() => {
            const blueprint = this.generateBluePrint(ninjaLevel, objective);
            this.renderBluePrint(blueprint);
            button.classList.remove('loading');
        }, 800);
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
        
        // Add additional maps without monsters
        this.additionalMaps.forEach(map => {
            if (!mapData.has(map.name)) {
                mapData.set(map.name, {
                    name: map.name,
                    type: map.type,
                    monsters: []
                });
            }
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

        this.updateMapStats();
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

        const monsterCount = map.monsters.length;
        const levelRange = monsterCount > 0 ? this.getMapLevelRange(map.monsters) : null;
        const imageUrl = this.getMapImageUrl(map.name);

        card.innerHTML = `
            <div class="map-image" style="background-image: url('${imageUrl}');"></div>
            <div class="map-header">
                <div class="map-name">${map.name}</div>
                <div class="map-type ${map.type}">${map.type.toUpperCase()}</div>
            </div>
            
            ${monsterCount > 0 ? `
            <div class="map-stats">
                <div class="stat-item">
                    <span class="stat-label">Monsters:</span>
                    <span class="stat-value">${monsterCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Level Range:</span>
                    <span class="stat-value">${levelRange.min}-${levelRange.max}</span>
                </div>
            </div>` : ''}
            
            ${monsterCount > 0 ? `
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
            </div>` : ''}
        `;

        return card;
    }

    getMapLevelRange(monsters) {
        if (monsters.length === 0) return null;
        const levels = monsters.map(m => m.level);
        return {
            min: Math.min(...levels),
            max: Math.max(...levels)
        };
    }

    formatNumber(num) {
        return num.toString();
    }

    getMapImageUrl(mapName) {
        const filename = mapName.replace(/ /g, '-').toLowerCase()
            .replace(/-(i|ii|iii|iv|v)$/i, (match, roman) => `-${roman.toUpperCase()}`) + '.png';
        return `https://archive.org/download/nsomtx-maps/${filename}`;
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'cord': 'Cord',
            'top_armor': 'Top Armor',
            'bottom_armor': 'Bottom Armor',
            'gloves': 'Gloves',
            'shoes': 'Shoes',
            'necklace': 'Necklace',
            'rings': 'Ring',
            'gems': 'Gem',
            'charms': 'Charm',
            'sword': 'Sword',
            'weapons': 'Weapons'
        };
        return categoryNames[category] || category;
    }
}

// Initialize Ninjadex when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Ninjadex();
});