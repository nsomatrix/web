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
        await this.loadLevelRequirements();
        this.processMaps();
        this.setupEventListeners();
        this.updateStats();
        this.renderMonsters();
        this.setRandomLevel();
    }

    async loadLevelRequirements() {
        try {
            const response = await fetch('json/level_requirements.json');
            const data = await response.json();
            this.levelRequirements = data.levels;
        } catch (error) {
            console.error('Failed to load level requirements:', error);
        }
    }

    setRandomLevel() {
        const randomLevel = Math.floor(Math.random() * 130) + 1;
        document.getElementById('ninjaLevel').placeholder = randomLevel.toString();
    }

    async loadMonsters() {
        this.showLoading('Loading monsters database');
        try {
            const response = await fetch('json/monsters_database.json');
            const data = await response.json();
            this.monsters = [...data.monsters.regular, ...data.monsters.cursed];
            this.filteredMonsters = [...this.monsters];
            this.additionalMaps = data.additional_maps || [];
        } catch (error) {
            console.error('Failed to load monsters:', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadEquipments() {
        this.showLoading('Loading equipment data');
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
        } finally {
            this.hideLoading();
        }
    }

    async loadItems() {
        this.showLoading('Loading items data');
        try {
            const response = await fetch('data/items.json');
            const data = await response.json();
            this.items = data;
            this.filteredItems = [...this.items];
        } catch (error) {
            console.error('Failed to load items:', error);
        } finally {
            this.hideLoading();
        }
    }



    async loadSkillsets() {
        this.showLoading('Loading skillsets data');
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
        } finally {
            this.hideLoading();
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

        // Format kins inputs
        document.getElementById('currentKins').addEventListener('input', (e) => {
            this.formatKinsInput(e.target);
        });
        document.getElementById('kinsPerHour').addEventListener('input', (e) => {
            this.formatKinsInput(e.target);
        });



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
        
        // Setup blueprint custom selects after DOM is ready
        setTimeout(() => {
            this.setupCustomSelect('playerClass', null);
            this.setupCustomSelect('objective', null);
        }, 100);

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select')) {
                document.querySelectorAll('.custom-select').forEach(select => {
                    select.classList.remove('open');
                });
            }
            
            // Handle map image clicks
            if (e.target.classList.contains('map-image')) {
                const imageUrl = e.target.dataset.imageUrl;
                const mapName = e.target.dataset.mapName;
                this.showFullscreenImage(imageUrl, mapName);
            }
            
            // Handle location tag clicks
            if (e.target.classList.contains('location-tag')) {
                const locationName = e.target.dataset.location;
                const imageUrl = this.getMapImageUrl(locationName);
                this.showFullscreenImage(imageUrl, locationName);
            }
            
            // Handle skill image clicks
            if (e.target.classList.contains('skill-image')) {
                const imageUrl = e.target.dataset.imageUrl;
                const skillName = e.target.dataset.skillName;
                this.showFullscreenImage(imageUrl, skillName);
            }
            
            // Handle equipment image clicks
            if (e.target.classList.contains('equipment-image')) {
                const imageUrl = e.target.dataset.imageUrl;
                const equipmentName = e.target.dataset.equipmentName;
                this.showFullscreenImage(imageUrl, equipmentName);
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
        const imageUrl = this.getSkillImageUrl(skill.name);

        card.innerHTML = `
            <div class="skill-image" style="background-image: url('${imageUrl}');" data-image-url="${imageUrl}" data-skill-name="${skill.name}"></div>
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
        const imageUrl = this.getEquipmentImageUrl(equipment.name);

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
            <div class="equipment-image" style="background-image: url('${imageUrl}');" data-image-url="${imageUrl}" data-equipment-name="${equipment.name}"></div>
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
                    ${monster.locations.map(loc => `<span class="location-tag" data-location="${loc}">${loc}</span>`).join('')}
                </div>
            </div>
        `;

        return card;
    }

    formatKinsInput(input) {
        const value = input.value.replace(/\D/g, '');
        input.value = this.formatKins(value);
    }

    parseKinsInput(input) {
        return parseFloat(input.replace(/\./g, '')) || 0;
    }

    formatKins(number) {
        const numStr = number.toString();
        let formatted = '';
        
        for (let i = 0; i < numStr.length; i++) {
            if (i > 0 && (numStr.length - i) % 3 === 0) {
                formatted += '.';
            }
            formatted += numStr[i];
        }
        
        return formatted;
    }



    generateTrainingPlan() {
        const playerClass = document.getElementById('playerClass').dataset.value;
        const ninjaLevel = parseInt(document.getElementById('ninjaLevel').value);
        const currentKins = this.parseKinsInput(document.getElementById('currentKins').value || '0');
        const kinsPerHour = this.parseKinsInput(document.getElementById('kinsPerHour').value || '0');
        const objective = document.getElementById('objective').dataset.value || 'kins';
        const button = document.getElementById('generatePlan');

        if (!playerClass) {
            alert('Please select your class');
            return;
        }

        if (!ninjaLevel || ninjaLevel < 1 || ninjaLevel > 130) {
            alert('Please enter a valid ninja level (1-130)');
            return;
        }

        if (objective === 'kins' && (!kinsPerHour || kinsPerHour <= 0)) {
            alert('Please enter your kins per hour for kins farming objective');
            return;
        }

        // Show loading state
        button.classList.add('loading');
        
        // Simulate processing time
        setTimeout(async () => {
            const blueprint = await this.generateAdvancedBluePrint({
                playerClass,
                ninjaLevel,
                currentKins,
                kinsPerHour,
                objective
            });
            this.renderAdvancedBluePrint(blueprint);
            button.classList.remove('loading');
        }, 1200);
    }

    async generateAdvancedBluePrint(params) {
        const { playerClass, ninjaLevel, currentKins, kinsPerHour, objective } = params;
        
        // Generate monsters analysis
        const monstersAnalysis = this.generateMonstersAnalysis(ninjaLevel, objective);
        
        // Generate skills analysis
        const skillsAnalysis = await this.generateSkillsAnalysis(playerClass, ninjaLevel);
        
        // Generate equipment analysis
        const equipmentAnalysis = this.generateEquipmentAnalysis(playerClass, ninjaLevel);
        
        // Generate estimator analysis
        const estimatorAnalysis = this.generateEstimatorAnalysis(ninjaLevel, currentKins, kinsPerHour, objective);
        
        // Generate pro tips
        const proTips = this.generateProTips(ninjaLevel, objective, playerClass);
        
        return {
            params,
            monstersAnalysis,
            skillsAnalysis,
            equipmentAnalysis,
            estimatorAnalysis,
            proTips
        };
    }

    generateMonstersAnalysis(ninjaLevel, objective) {
        let levelRange, suitableMonsters;
        
        if (objective === 'kins') {
            // Kins: ±7 levels, but prioritize LOWEST possible (level-7)
            levelRange = { min: ninjaLevel - 7, max: ninjaLevel + 7 };
            suitableMonsters = this.monsters.filter(monster => 
                monster.level >= levelRange.min && monster.level <= levelRange.max
            );
            
            if (ninjaLevel >= 108) {
                // Level 108+ must use cursed monsters for kins
                suitableMonsters = suitableMonsters.filter(m => m.type === 'cursed');
                // For 108+, prioritize level-7 cursed monsters
                const targetLevel = ninjaLevel - 7;
                const bestLevelMonsters = suitableMonsters.filter(m => m.level === targetLevel);
                if (bestLevelMonsters.length > 0) {
                    suitableMonsters = bestLevelMonsters;
                }
            } else {
                // Below 108: use regular monsters only
                suitableMonsters = suitableMonsters.filter(m => m.type === 'regular');
                // Prioritize exactly level-7 monsters for best kins
                const targetLevel = ninjaLevel - 7;
                const bestLevelMonsters = suitableMonsters.filter(m => m.level === targetLevel);
                if (bestLevelMonsters.length > 0) {
                    suitableMonsters = bestLevelMonsters;
                } else {
                    // If no level-7 monsters, get closest to level-7
                    suitableMonsters.sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel));
                    suitableMonsters = suitableMonsters.slice(0, 5);
                }
            }
            
            // Sort by lowest level first, then by lowest HP
            suitableMonsters.sort((a, b) => a.level - b.level || a.hp - b.hp);
        } else {
            // Level: ±10 levels, prefer HIGHEST possible (level+10)
            levelRange = { min: ninjaLevel - 10, max: ninjaLevel + 10 };
            suitableMonsters = this.monsters.filter(monster => 
                monster.level >= levelRange.min && monster.level <= levelRange.max
            );
            
            // Prioritize cursed monsters for better exp
            const cursedMonsters = suitableMonsters.filter(m => m.type === 'cursed');
            if (cursedMonsters.length > 0) {
                // Prioritize exactly level+10 cursed monsters
                const targetLevel = ninjaLevel + 10;
                const bestLevelMonsters = cursedMonsters.filter(m => m.level === targetLevel);
                if (bestLevelMonsters.length > 0) {
                    suitableMonsters = bestLevelMonsters;
                } else {
                    suitableMonsters = cursedMonsters;
                }
            }
            
            // Sort by highest level first (more exp)
            suitableMonsters.sort((a, b) => b.level - a.level);
        }
        
        const mapGroups = this.groupMonstersByMaps(suitableMonsters.slice(0, 8)).slice(0, 1);
        
        return {
            objective,
            levelRange,
            mapGroups,
            totalMonsters: suitableMonsters.length,
            recommendedType: objective === 'kins' ? (ninjaLevel >= 108 ? 'cursed' : 'regular') : 'cursed',
            targetLevel: objective === 'kins' ? ninjaLevel - 7 : ninjaLevel + 10
        };
    }

    async generateSkillsAnalysis(playerClass, ninjaLevel) {
        if (!this.skillsets || this.skillsets.length === 0) {
            await this.loadSkillsets();
        }
        
        const classSkills = this.skillsets.filter(skill => skill.class === playerClass);
        const availableAutoSkills = classSkills.filter(skill => skill.level <= ninjaLevel && skill.classification === 'auto');
        const nextAutoSkills = classSkills.filter(skill => 
            skill.level > ninjaLevel && 
            skill.classification === 'auto' && 
            skill.level <= ninjaLevel + 30
        ).sort((a, b) => a.level - b.level);
        
        // Get the highest available auto skill
        const currentSkill = availableAutoSkills.length > 0 ? 
            availableAutoSkills.reduce((max, skill) => skill.level > max.level ? skill : max) : null;
        
        return {
            playerClass,
            currentSkill,
            availableSkills: availableAutoSkills.slice(-3), // Last 3 available auto skills
            nextSkills: nextAutoSkills.slice(0, 3), // Next 3 auto skills to unlock
            recommendLevel90: ninjaLevel >= 90
        };
    }

    generateEquipmentAnalysis(playerClass, ninjaLevel) {
        const suitableEquipments = this.equipments.filter(equipment => {
            // Filter by level (within reasonable range)
            if (equipment.level > ninjaLevel + 20) return false;
            
            // Filter by class for weapons
            if (equipment.category === 'sword' && equipment.weapon_type) {
                return equipment.weapon_type === playerClass;
            }
            
            return true;
        });
        
        // Group by category
        const categories = {};
        suitableEquipments.forEach(equipment => {
            const category = equipment.category === 'sword' ? equipment.weapon_type : equipment.category;
            if (!categories[category]) categories[category] = [];
            categories[category].push(equipment);
        });
        
        // Get best items from each category
        const recommendations = {};
        Object.keys(categories).forEach(category => {
            const items = categories[category];
            // Sort by level (descending) and take top 2
            items.sort((a, b) => b.level - a.level);
            recommendations[category] = items.slice(0, 2);
        });
        
        return {
            playerClass,
            recommendations,
            totalEquipments: suitableEquipments.length
        };
    }

    generateEstimatorAnalysis(ninjaLevel, currentKins, kinsPerHour, objective) {
        const analysis = {};
        
        if (objective === 'kins' && kinsPerHour > 0) {
            // Kins estimation
            const kinsPerDay = kinsPerHour * 24;
            const kinsPerWeek = kinsPerDay * 7;
            const kinsPerMonth = kinsPerDay * 30;
            
            analysis.kins = {
                current: currentKins,
                perHour: kinsPerHour,
                perDay: kinsPerDay,
                perWeek: kinsPerWeek,
                perMonth: kinsPerMonth,
                projections: {
                    '1_week': currentKins + kinsPerWeek,
                    '1_month': currentKins + kinsPerMonth,
                    '3_months': currentKins + (kinsPerMonth * 3)
                }
            };
        }
        
        if (objective === 'level' && this.levelRequirements) {
            // Level estimation (simplified)
            const nextLevel = ninjaLevel + 1;
            if (nextLevel <= 130 && this.levelRequirements[nextLevel.toString()]) {
                const expNeeded = this.levelRequirements[nextLevel.toString()];
                // Assume 1% per hour as base rate
                const hoursToNextLevel = 100; // 100 hours for 100%
                
                analysis.level = {
                    current: ninjaLevel,
                    next: nextLevel,
                    expNeeded: expNeeded,
                    estimatedHours: hoursToNextLevel,
                    estimatedDays: Math.ceil(hoursToNextLevel / 24)
                };
            }
        }
        
        return analysis;
    }

    generateProTips(ninjaLevel, objective, playerClass) {
        const tips = [];
        
        // Level-based tips
        if (ninjaLevel >= 90) {
            tips.push({
                title: 'Use Level 90 Skills',
                content: 'At level 90+, always use your level 90 skill (Kage Bunshin no Jutsu) for better grind rate and efficiency.',
                type: 'skill'
            });
        }
        
        // Kins farming tips
        if (objective === 'kins') {
            if (ninjaLevel >= 108) {
                tips.push({
                    title: 'Kich Yên Technique (Level 108+)',
                    content: 'Team up with 4+ accounts to reduce monster HP by 30%. This technique is essential for high-level kins farming in cursed lands.',
                    type: 'kich-yen',
                    isKichYen: true
                });
            }
            
            if (ninjaLevel <= 107) {
                tips.push({
                    title: 'Regular Monsters for Kins',
                    content: 'Focus on regular monsters 7 levels below your current level for maximum kins efficiency and easier kills.',
                    type: 'strategy'
                });
            }
        }
        
        // Potion recommendations
        if (ninjaLevel >= 60) {
            const mpPotPercent = Math.min(40, Math.floor((ninjaLevel - 50) / 10) * 10 + 10);
            tips.push({
                title: 'MP Potion Usage',
                content: `Use ${mpPotPercent}% MP potions for sustained grinding. Recommended pot levels: 10, 30, 50, 70, 90.`,
                type: 'potion'
            });
        }
        
        if (ninjaLevel >= 90) {
            const hpPotPercent = Math.min(40, Math.floor((ninjaLevel - 80) / 10) * 10 + 10);
            tips.push({
                title: 'HP Potion Usage',
                content: `Use ${hpPotPercent}% HP potions for safety. Increment by 10% every 10 levels for optimal efficiency.`,
                type: 'potion'
            });
        }
        
        // Class-specific tips
        const classSchools = {
            'sword': 'hirosaki', 'shuriken': 'hirosaki',
            'kunai': 'ookaza', 'bow': 'ookaza',
            'blade': 'haruna', 'fan': 'haruna'
        };
        
        if (classSchools[playerClass]) {
            tips.push({
                title: `${playerClass.toUpperCase()} Class Strategy`,
                content: `As a ${playerClass} user from ${classSchools[playerClass]} school, focus on your class-specific equipment and skills for maximum effectiveness.`,
                type: 'class'
            });
        }
        
        return tips;
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

    renderAdvancedBluePrint(blueprint) {
        // Render monsters analysis
        this.renderMonstersAnalysis(blueprint.monstersAnalysis);
        
        // Render skills analysis
        this.renderSkillsAnalysis(blueprint.skillsAnalysis);
        
        // Render equipment analysis
        this.renderEquipmentAnalysis(blueprint.equipmentAnalysis);
        
        // Render estimator analysis
        this.renderEstimatorAnalysis(blueprint.estimatorAnalysis);
        
        // Render pro tips
        this.renderProTips(blueprint.proTips);
        
        document.getElementById('planResults').style.display = 'block';
    }

    renderMonstersAnalysis(analysis) {
        const container = document.getElementById('recommendedMonsters');
        container.innerHTML = '';

        if (analysis.mapGroups.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No suitable monsters found for your level and objective.</p>';
            return;
        }

        // Add objective summary
        const summary = document.createElement('div');
        summary.className = 'blueprint-summary';
        const targetText = analysis.objective === 'kins' ? 
            `Target Level: ${analysis.targetLevel} (your level -7 for easiest kills)` : 
            `Target Level: ${analysis.targetLevel} (your level +10 for maximum EXP)`;
        summary.innerHTML = `
            <div class="summary-text">
                <strong>Objective:</strong> ${analysis.objective === 'kins' ? 'Farm Kins (Lowest HP Priority)' : 'Boost Level (Highest EXP Priority)'}<br>
                <strong>${targetText}</strong><br>
                <strong>Recommended Type:</strong> ${analysis.recommendedType.toUpperCase()} monsters
            </div>
        `;
        container.appendChild(summary);

        if (analysis.objective === 'kins') {
            const kichYenNote = document.createElement('div');
            kichYenNote.className = 'tip-card';
            kichYenNote.style.marginBottom = '1rem';
            kichYenNote.innerHTML = `
                <div class="tip-title">Kins Farming Strategy</div>
                <div class="tip-content">For level 99: Target level 92 monsters (99-7=92) for maximum kins with lowest HP. Regular monsters give best kins rates.</div>
            `;
            container.appendChild(kichYenNote);
        }

        // Render map groups with images
        analysis.mapGroups.forEach(mapGroup => {
            const mapCard = document.createElement('div');
            mapCard.className = 'blueprint-map';
            const imageUrl = this.getMapImageUrl(mapGroup.mapName);
            
            mapCard.innerHTML = `
                <div class="map-image" style="background-image: url('${imageUrl}');" data-image-url="${imageUrl}" data-map-name="${mapGroup.mapName}"></div>
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
    }

    renderSkillsAnalysis(analysis) {
        const container = document.getElementById('recommendedSkills');
        container.innerHTML = '';

        if (!analysis.currentSkill) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No skills available for your level.</p>';
            return;
        }

        // Current skill
        const currentSkillCard = this.createSkillAnalysisCard(analysis.currentSkill, 'Current Best Auto Skill', 'Your highest available auto skill');
        container.appendChild(currentSkillCard);

        // Next auto skills to unlock
        if (analysis.nextSkills.length > 0) {
            const nextSkillsTitle = document.createElement('h4');
            nextSkillsTitle.textContent = 'Next Auto Skills to Unlock';
            nextSkillsTitle.style.color = 'var(--text-primary)';
            nextSkillsTitle.style.marginTop = '1.5rem';
            nextSkillsTitle.style.marginBottom = '1rem';
            container.appendChild(nextSkillsTitle);

            analysis.nextSkills.forEach(skill => {
                const skillCard = this.createSkillAnalysisCard(skill, `Level ${skill.level}`, 'Auto skill');
                container.appendChild(skillCard);
            });
        }

        // Level 90 recommendation
        if (analysis.recommendLevel90) {
            const level90Tip = document.createElement('div');
            level90Tip.className = 'tip-card';
            level90Tip.innerHTML = `
                <div class="tip-title">Level 90+ Recommendation</div>
                <div class="tip-content">Use your level 90 skill (Kage Bunshin no Jutsu) for optimal grinding efficiency.</div>
            `;
            container.appendChild(level90Tip);
        }
    }

    createSkillAnalysisCard(skill, title, subtitle) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        const imageUrl = this.getSkillImageUrl(skill.name);

        card.innerHTML = `
            <div class="skill-image" style="background-image: url('${imageUrl}');" data-image-url="${imageUrl}" data-skill-name="${skill.name}"></div>
            <div class="skill-header">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-level">Level ${skill.level}</div>
            </div>
            <div class="skill-class-info">
                <span class="skill-class ${skill.class}">${skill.class.toUpperCase()}</span>
                <span class="skill-school ${skill.school}">${skill.school.toUpperCase()}</span>
            </div>
            <div class="skill-description">${skill.description}</div>
            <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--tertiary-bg); border-radius: 4px;">
                <div style="font-weight: bold; color: var(--accent-color);">${title}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">${subtitle}</div>
            </div>
        `;

        return card;
    }

    renderEquipmentAnalysis(analysis) {
        const container = document.getElementById('recommendedEquipment');
        container.innerHTML = '';

        if (Object.keys(analysis.recommendations).length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No suitable equipment found for your class and level.</p>';
            return;
        }

        Object.keys(analysis.recommendations).forEach(category => {
            const items = analysis.recommendations[category];
            if (items.length === 0) return;

            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = this.getCategoryDisplayName(category);
            categoryTitle.style.color = 'var(--text-primary)';
            categoryTitle.style.marginBottom = '1rem';
            if (category !== Object.keys(analysis.recommendations)[0]) {
                categoryTitle.style.marginTop = '1.5rem';
            }
            container.appendChild(categoryTitle);

            items.forEach(equipment => {
                const equipmentCard = this.createEquipmentCard(equipment);
                container.appendChild(equipmentCard);
            });
        });
    }

    renderEstimatorAnalysis(analysis) {
        const container = document.getElementById('estimatorResults');
        container.innerHTML = '';

        if (analysis.kins) {
            const kinsSection = document.createElement('div');
            kinsSection.className = 'estimator-section';
            kinsSection.innerHTML = `
                <div class="estimator-title">Kins Projection</div>
                <div class="estimator-value">${this.formatKins(analysis.kins.current)} current kins</div>
                <div class="estimator-breakdown">
                    Per hour: ${this.formatKins(analysis.kins.perHour)}<br>
                    Per day: ${this.formatKins(analysis.kins.perDay)}<br>
                    Per week: ${this.formatKins(analysis.kins.perWeek)}<br>
                    Per month: ${this.formatKins(analysis.kins.perMonth)}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <strong>Projections:</strong><br>
                    1 week: ${this.formatKins(analysis.kins.projections['1_week'])}<br>
                    1 month: ${this.formatKins(analysis.kins.projections['1_month'])}<br>
                    3 months: ${this.formatKins(analysis.kins.projections['3_months'])}
                </div>
            `;
            container.appendChild(kinsSection);
        }

        if (analysis.level) {
            const levelSection = document.createElement('div');
            levelSection.className = 'estimator-section';
            levelSection.innerHTML = `
                <div class="estimator-title">Level Progression</div>
                <div class="estimator-value">Level ${analysis.level.current} → ${analysis.level.next}</div>
                <div class="estimator-breakdown">
                    EXP needed: ${this.formatKins(analysis.level.expNeeded)}<br>
                    Estimated time: ${analysis.level.estimatedHours} hours<br>
                    Estimated days: ${analysis.level.estimatedDays} days
                </div>
            `;
            container.appendChild(levelSection);
        }

        if (!analysis.kins && !analysis.level) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Complete all input fields to see detailed analysis.</p>';
        }
    }

    renderProTips(tips) {
        const container = document.getElementById('proTips');
        container.innerHTML = '';

        if (tips.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No specific tips available for your current setup.</p>';
            return;
        }

        tips.forEach(tip => {
            const tipCard = document.createElement('div');
            tipCard.className = tip.isKichYen ? 'tip-card kich-yen-card' : 'tip-card';
            tipCard.innerHTML = `
                <div class="tip-title">${tip.title}</div>
                <div class="tip-content">${tip.content}</div>
            `;
            container.appendChild(tipCard);
        });
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
            <div class="map-image" style="background-image: url('${imageUrl}');" data-image-url="${imageUrl}" data-map-name="${map.name}"></div>
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

    getSkillImageUrl(skillName) {
        let filename = skillName.toLowerCase()
            .replace(/\s+/g, '')  // Remove all spaces
            .replace(/\./g, '')   // Remove dots
            .replace(/'/g, '')    // Remove apostrophes
            .replace(/-/g, '');   // Remove hyphens from skill name
        
        // Handle special cases that have hyphens in filenames
        if (skillName === 'Aisu Meiku') filename = 'aisu-meiku';
        if (skillName === 'Enko Bakusatsu') filename = 'enko-bakusatsu';
        if (skillName === 'Choukou Shuriken') filename = 'choukou-shuriken';
        if (skillName === 'X Zangeki') filename = 'x-zangeki';
        if (skillName === 'Kage Bunshin no Jutsu') filename = 'kage-bunshin-no-jutsu';
        
        return `https://archive.org/download/nsomtx-skills/${filename}.png`;
    }

    getEquipmentImageUrl(equipmentName) {
        const filename = equipmentName.replace(/ /g, '-').toLowerCase() + '.png';
        return `https://archive.org/download/nsomtx-equips/${filename}`;
    }

    showLoading(text = 'Loading') {
        window.showLoading(text);
    }

    hideLoading() {
        window.hideLoading();
    }

    showFullscreenImage(imageUrl, mapName) {
        this.showLoading('Loading map image');
        
        const modal = document.createElement('div');
        modal.className = 'fullscreen-modal';
        modal.innerHTML = `
            <div class="fullscreen-content">
                <span class="close-btn">&times;</span>
                <img src="${imageUrl}" alt="${mapName}" class="fullscreen-image" onload="window.ninjadexInstance.hideLoading()" onerror="window.ninjadexInstance.hideLoading()">
                <div class="image-title">${mapName}</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => document.body.removeChild(modal);
        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };
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
    window.ninjadexInstance = new Ninjadex();
});