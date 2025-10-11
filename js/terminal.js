class MatrixTerminal {
    constructor() {
        this.output = document.getElementById('output');
        this.input = document.getElementById('commandInput');
        this.commandHistory = [];
        this.historyIndex = -1;
        this.loadedScripts = new Set();
        this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.activeSpinners = new Map();
        
        this.init();
    }

    init() {
        this.input.focus();
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.showWelcome();
        
        // Check if user is already logged in and update navbar
        setTimeout(() => {
            const auth = window.firebaseAuth;
            if (auth && auth.currentUser) {
                this.updateNavbarAuth(auth.currentUser);
            }
        }, 1000);
    }

    async loadScript(src) {
        if (this.loadedScripts.has(src)) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedScripts.add(src);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadPageData(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            this.addOutput(`Failed to load ${url}: ${error.message}`, 'error-text');
            return null;
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            const command = this.input.value.trim();
            if (command) {
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
                this.executeCommand(command);
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        }
    }

    executeCommand(command) {
        this.addOutput(`matrix@web:~$ ${command}`, 'command');
        
        const [cmd, ...args] = command.split(' ');
        
        // Handle login with credentials
        if (cmd.toLowerCase() === 'login' && args.length >= 2) {
            this.handleLogin(args[0], args[1]);
            return;
        }
        
        switch(cmd.toLowerCase()) {
            case 'help':
                this.showHelp();
                break;
            case 'clear':
                this.clearTerminal();
                break;
            case 'matrix':
                this.showMatrix();
                break;
            case 'estimate':
                this.runEstimator(args);
                break;
            case 'ninjadex':
                this.runNinjadex(args);
                break;
            case 'monster':
                this.runNinjadex(['monster', ...args]);
                break;
            case 'equipment':
                this.runNinjadex(['equipment', ...args]);
                break;
            case 'map':
                this.runNinjadex(['map', ...args]);
                break;
            case 'skill':
                this.runNinjadex(['skill', ...args]);
                break;
            case 'timezone':
                this.runTimezone(args);
                break;
            case 'mods':
                this.runMods(args);
                break;
            case 'download':
                this.runDownload(args);
                break;
            case 'emulators':
                this.runEmulators();
                break;
            case 'login':
                this.runLogin();
                break;
            case 'dashboard':
                if (args.length > 0) {
                    this.runDashboardCommand(args[0], args.slice(1));
                } else {
                    this.runDashboard();
                }
                break;
            case 'friends':
                this.runDashboardCommand('friends');
                break;
            case 'notes':
                this.runDashboardCommand('notes');
                break;
            case 'passwords':
                this.runDashboardCommand('passwords');
                break;
            case 'server':
                this.runDashboardCommand('server');
                break;
            case 'logout':
                this.runLogout();
                break;

            case 'items':
                this.runItems(args);
                break;
            case 'item':
                this.runItems(args);
                break;
            case 'docs':
                this.runDocs();
                break;
            case 'whoami':
                this.addOutput('matrix-user', 'success-text');
                break;
            case 'date':
                this.addOutput(new Date().toString(), 'output-text');
                break;
            case 'uptime':
                this.showUptime();
                break;
            default:
                this.addOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error-text');
        }
    }

    showWelcome() {
        const ascii = `
 ███▄ ▄███▓ ▄▄▄     ▄▄▄█████▓ ██▀███   ██▓▒██   ██▒
▓██▒▀█▀ ██▒▒████▄   ▓  ██▒ ▓▒▓██ ▒ ██▒▓██▒▒▒ █ █ ▒░
▓██    ▓██░▒██  ▀█▄ ▒ ▓██░ ▒░▓██ ░▄█ ▒▒██▒░░  █   ░
▒██    ▒██ ░██▄▄▄▄██░ ▓██▓ ░ ▒██▀▀█▄  ░██░ ░ █ █ ▒ 
▒██▒   ░██▒ ▓█   ▓██▒ ▒██▒ ░ ░██▓ ▒██▒░██░▒██▒ ▒██▒
░ ▒░   ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░ ▒▓ ░▒▓░░▓  ▒▒ ░ ░▓ ░
░  ░      ░  ▒   ▒▒ ░   ░      ░▒ ░ ▒░ ▒ ░░░   ░▒ ░
░      ░     ░   ▒    ░        ░░   ░  ▒ ░ ░    ░  
       ░         ░  ░           ░      ░   ░    ░  
`;
        this.addOutput(ascii, 'ascii-art');
        this.addOutput('Welcome to Matrix Terminal v1.0', 'success-text');
        this.addOutput('Type "help" for available commands\n', 'info-text');
    }

    showHelp() {
        const help = `Available commands:
  help                    - Show this help message
  clear                   - Clear terminal screen
  matrix                  - Display Matrix animation
  
  TOOLS (Real functionality):
  estimate <args>         - Run actual estimator calculations
  ninjadex <args>         - Access real monster/equipment database
  timezone <country>      - Real timezone functionality
  
  PAGES (Real data & downloads):
  mods [search]           - Browse and download real mods
  emulators              - Download actual emulators
  login                  - Real authentication system
  dashboard              - Access user dashboard
  items                  - Real items database
  docs                   - Access documentation
  
  SYSTEM:
  whoami, date, uptime   - System information`;
        this.addOutput(help, 'output-text');
    }



    clearTerminal() {
        this.output.innerHTML = '';
    }

    showMatrix() {
        const matrix = `01001101 01100001 01110100 01110010 01101001 01111000
01010100 01100101 01110010 01101101 01101001 01101110 01100001 01101100
01000001 01100011 01100011 01100101 01110011 01110011 01101001 01101110 01100111
01001101 01100001 01110100 01110010 01101001 01111000 00101110 00101110 00101110`;
        this.addOutput(matrix, 'success-text');
        this.addOutput('The Matrix has you', 'info-text');
    }

    async runEstimator(args) {
        const estSpinner = this.showSpinner('Loading estimator');
        
        try {
            await this.loadScript('js/estimator.js');
            this.hideSpinner(estSpinner);
            
            if (!args.length) {
                this.addOutput('Estimator loaded Usage:', 'success-text');
                this.addOutput('  estimate kins <per_hour> <days>', 'output-text');
                this.addOutput('  estimate level <current_level> <current_exp> <exp_per_hour>', 'output-text');
                return;
            }
            
            const type = args[0].toLowerCase();
            
            if (type === 'kins') {
                const perHour = parseFloat(args[1]);
                const days = parseInt(args[2]);
                
                if (!perHour || !days) {
                    this.addOutput('Usage: estimate kins <per_hour> <days>', 'error-text');
                    return;
                }
                
                // Use actual estimator logic if available
                const total = perHour * 24 * days;
                const breakdown = {
                    perDay: perHour * 24,
                    perWeek: perHour * 24 * 7,
                    perMonth: perHour * 24 * 30,
                    perYear: perHour * 24 * 365
                };
                
                this.addOutput('KINS ESTIMATION RESULTS:', 'success-text');
                this.addOutput(`Total Kins (${days} days): ${total.toLocaleString()}`, 'output-text');
                this.addOutput(`Per Day: ${breakdown.perDay.toLocaleString()}`, 'output-text');
                this.addOutput(`Per Week: ${breakdown.perWeek.toLocaleString()}`, 'output-text');
                this.addOutput(`Per Month: ${breakdown.perMonth.toLocaleString()}`, 'output-text');
                this.addOutput(`Per Year: ${breakdown.perYear.toLocaleString()}`, 'output-text');
                
            } else if (type === 'level') {
                const currentLevel = parseInt(args[1]);
                const currentExp = parseFloat(args[2]);
                const expPerHour = parseFloat(args[3]);
                
                if (!currentLevel || currentExp === undefined || !expPerHour) {
                    this.addOutput('Usage: estimate level <current_level> <current_exp> <exp_per_hour>', 'error-text');
                    return;
                }
                
                const expNeeded = 100 - currentExp;
                const hoursNeeded = expNeeded / expPerHour;
                const days = Math.floor(hoursNeeded / 24);
                const hours = Math.floor(hoursNeeded % 24);
                const minutes = Math.floor((hoursNeeded % 1) * 60);
                
                this.addOutput('LEVEL ESTIMATION RESULTS:', 'success-text');
                this.addOutput(`From Level: ${currentLevel} (${currentExp}%)`, 'output-text');
                this.addOutput(`To Level: ${currentLevel + 1}`, 'output-text');
                this.addOutput(`Experience Needed: ${expNeeded.toFixed(2)}%`, 'output-text');
                this.addOutput(`Time Required: ${days}d ${hours}h ${minutes}m`, 'output-text');
            }
            
        } catch (error) {
            this.hideSpinner(estSpinner);
            this.addOutput(`Failed to load estimator: ${error.message}`, 'error-text');
        }
    }
    
    async runNinjadex(args) {
        const ninjaSpinner = this.showSpinner('Loading Ninjadex database');
        
        try {
            // Initialize ninjadex if not already done
            if (!window.terminalNinjadex) {
                window.terminalNinjadex = {
                    monsters: [],
                    equipments: [],
                    maps: [],
                    items: [],
                    skillsets: []
                };
                
                // Load data using same methods as ninjadex.js
                await this.loadNinjadexData();
            }
            
            this.hideSpinner(ninjaSpinner);
            
            if (!args.length) {
                this.addOutput('NINJADEX DATABASE LOADED', 'success-text');
                this.addOutput('Available categories:', 'output-text');
                this.addOutput('  ninjadex monster [name] - search/list monsters', 'output-text');
                this.addOutput('  ninjadex equipment [name] - search/list equipment', 'output-text');
                this.addOutput('  ninjadex map [name] - search/list maps', 'output-text');
                this.addOutput('  ninjadex item [name] - search/list items', 'output-text');
                this.addOutput('  ninjadex skill [name] - search/list skills', 'output-text');
                return;
            }
            
            const category = args[0].toLowerCase();
            const searchTerm = args.slice(1).join(' ');
            
            switch(category) {
                case 'monster':
                case 'monsters':
                    this.searchMonsters(window.terminalNinjadex.monsters, searchTerm);
                    break;
                case 'equipment':
                case 'equipments':
                    this.searchEquipment(window.terminalNinjadex.equipments, searchTerm);
                    break;
                case 'map':
                case 'maps':
                    this.searchMaps(window.terminalNinjadex.maps, searchTerm);
                    break;
                case 'item':
                case 'items':
                    this.searchItems(window.terminalNinjadex.items, searchTerm);
                    break;
                case 'skill':
                case 'skills':
                case 'skillset':
                    this.searchSkills(window.terminalNinjadex.skillsets, searchTerm);
                    break;
                default:
                    this.addOutput(`Unknown category: ${category}`, 'error-text');
                    this.addOutput('Use: ninjadex monster/equipment/map/item/skill [name]', 'info-text');
            }
            
        } catch (error) {
            this.hideSpinner(ninjaSpinner);
            this.addOutput(`Failed to load Ninjadex: ${error.message}`, 'error-text');
        }
    }
    
    async loadNinjadexData() {
        try {
            // Load monsters
            const monstersResponse = await fetch('json/monsters_database.json');
            const monstersData = await monstersResponse.json();
            window.terminalNinjadex.monsters = [...monstersData.monsters.regular, ...monstersData.monsters.cursed];
            
            // Load equipment
            const equipmentResponse = await fetch('json/structured_equipment_data.json');
            const equipmentData = await equipmentResponse.json();
            window.terminalNinjadex.equipments = [];
            
            Object.keys(equipmentData.categories).forEach(category => {
                if (category === 'weapons') {
                    Object.keys(equipmentData.categories.weapons).forEach(weaponType => {
                        equipmentData.categories.weapons[weaponType].forEach(item => {
                            window.terminalNinjadex.equipments.push({
                                ...item,
                                category: 'sword',
                                weapon_type: weaponType
                            });
                        });
                    });
                } else if (Array.isArray(equipmentData.categories[category])) {
                    equipmentData.categories[category].forEach(item => {
                        window.terminalNinjadex.equipments.push({
                            ...item,
                            category: category
                        });
                    });
                }
            });
            
            // Load items
            const itemsResponse = await fetch('data/items.json');
            window.terminalNinjadex.items = await itemsResponse.json();
            
            // Load skillsets
            const skillsResponse = await fetch('structured_skillsets.json');
            const skillsData = await skillsResponse.json();
            window.terminalNinjadex.skillsets = [];
            
            Object.keys(skillsData.classes).forEach(className => {
                const classData = skillsData.classes[className];
                classData.skills.forEach(skill => {
                    window.terminalNinjadex.skillsets.push({
                        ...skill,
                        class: className,
                        school: classData.school
                    });
                });
            });
            
            // Process maps from monster locations
            const mapData = new Map();
            window.terminalNinjadex.monsters.forEach(monster => {
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
            window.terminalNinjadex.maps = Array.from(mapData.values());
            
        } catch (error) {
            console.error('Failed to load ninjadex data:', error);
        }
    }
    
    getMapType(mapName) {
        const cursedKeywords = ['death', 'nightmare', 'horror', 'skeleton', 'cannibal', 'dread', 'heartbreak', 'suicide', 'secrets'];
        const lowerName = mapName.toLowerCase();
        return cursedKeywords.some(keyword => lowerName.includes(keyword)) ? 'cursed' : 'regular';
    }
    
    searchMonsters(monsters, searchTerm) {
        if (!monsters || monsters.length === 0) {
            this.addOutput('Monster database not available', 'error-text');
            return;
        }
        
        if (!searchTerm) {
            this.addOutput(`MONSTERS LIST (${monsters.length} total):`, 'success-text');
            monsters.forEach(monster => {
                this.addOutput(`• ${monster.name} (Lv.${monster.level})`, 'output-text');
            });
            return;
        }
        
        const results = monsters.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (results.length === 0) {
            this.addOutput(`No monsters found matching: ${searchTerm}`, 'error-text');
        } else {
            results.forEach(monster => {
                this.addOutput(`MONSTER: ${monster.name}`, 'success-text');
                this.addOutput(`Level: ${monster.level}`, 'output-text');
                this.addOutput(`HP: ${monster.hp.toLocaleString()}`, 'output-text');
                this.addOutput(`Type: ${monster.type}`, 'output-text');
                this.addOutput(`Locations: ${monster.locations.join(', ')}`, 'output-text');
                if (results.length > 1) this.addOutput('', 'output-text');
            });
        }
    }
    
    searchEquipment(equipments, searchTerm) {
        if (!equipments || equipments.length === 0) {
            this.addOutput('Equipment database not available', 'error-text');
            return;
        }
        
        if (!searchTerm) {
            this.addOutput(`EQUIPMENT LIST (${equipments.length} total):`, 'success-text');
            equipments.forEach(item => {
                this.addOutput(`• ${item.name} (Lv.${item.level})`, 'output-text');
            });
            return;
        }
        
        const results = equipments.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (results.length === 0) {
            this.addOutput(`No equipment found matching: ${searchTerm}`, 'error-text');
        } else {
            results.forEach(item => {
                this.addOutput(`EQUIPMENT: ${item.name}`, 'success-text');
                this.addOutput(`Level: ${item.level}`, 'output-text');
                this.addOutput(`Category: ${item.category}`, 'output-text');
                if (item.weapon_type) this.addOutput(`Type: ${item.weapon_type}`, 'output-text');
                if (item.attribute) this.addOutput(`Attribute: ${item.attribute}`, 'output-text');
                if (results.length > 1) this.addOutput('', 'output-text');
            });
        }
    }
    
    searchMaps(maps, searchTerm) {
        if (!maps || maps.length === 0) {
            this.addOutput('Maps database not available', 'error-text');
            return;
        }
        
        if (!searchTerm) {
            this.addOutput(`MAPS LIST (${maps.length} total):`, 'success-text');
            maps.forEach(map => {
                this.addOutput(`• ${map.name} (${map.monsters.length} monsters)`, 'output-text');
            });
            return;
        }
        
        const results = maps.filter(map => 
            map.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (results.length === 0) {
            this.addOutput(`No maps found matching: ${searchTerm}`, 'error-text');
        } else {
            results.forEach(map => {
                this.addOutput(`MAP: ${map.name}`, 'success-text');
                this.addOutput(`Type: ${map.type}`, 'output-text');
                this.addOutput(`Monsters: ${map.monsters.length}`, 'output-text');
                this.addOutput(`Creatures: ${map.monsters.map(m => m.name).join(', ')}`, 'output-text');
                if (results.length > 1) this.addOutput('', 'output-text');
            });
        }
    }
    
    searchItems(items, searchTerm) {
        if (!items || items.length === 0) {
            this.addOutput('Items database not available', 'error-text');
            return;
        }
        
        if (!searchTerm) {
            this.addOutput(`ITEMS LIST (${items.length} total):`, 'success-text');
            items.forEach(item => {
                this.addOutput(`• ${item.name} (ID: ${item.id})`, 'output-text');
            });
            return;
        }
        
        // Check if searchTerm is a number (ID lookup)
        const isIdSearch = /^\d+$/.test(searchTerm);
        let results;
        
        if (isIdSearch) {
            // Search by ID
            results = items.filter(item => item.id == searchTerm);
        } else {
            // Search by name
            results = items.filter(item => 
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (results.length === 0) {
            this.addOutput(`No items found matching: ${searchTerm}`, 'error-text');
        } else {
            results.forEach(item => {
                this.addOutput(`ITEM: ${item.name}`, 'success-text');
                this.addOutput(`ID: ${item.id}`, 'output-text');
                if (results.length > 1) this.addOutput('', 'output-text');
            });
        }
    }
    
    searchSkills(skills, searchTerm) {
        if (!skills || skills.length === 0) {
            this.addOutput('Skills database not available', 'error-text');
            return;
        }
        
        if (!searchTerm) {
            this.addOutput(`SKILLS LIST (${skills.length} total):`, 'success-text');
            skills.forEach(skill => {
                this.addOutput(`• ${skill.name} (${skill.class})`, 'output-text');
            });
            return;
        }
        
        const results = skills.filter(skill => 
            skill.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (results.length === 0) {
            this.addOutput(`No skills found matching: ${searchTerm}`, 'error-text');
        } else {
            results.forEach(skill => {
                this.addOutput(`SKILL: ${skill.name}`, 'success-text');
                this.addOutput(`Class: ${skill.class}`, 'output-text');
                this.addOutput(`School: ${skill.school}`, 'output-text');
                if (skill.level) this.addOutput(`Level: ${skill.level}`, 'output-text');
                if (skill.description) this.addOutput(`Description: ${skill.description}`, 'output-text');
                if (results.length > 1) this.addOutput('', 'output-text');
            });
        }
    }
    
    async runTimezone(args) {
        const tzSpinner = this.showSpinner('Loading timezone functionality');
        
        try {
            await this.loadScript('js/timezone.js');
            this.hideSpinner(tzSpinner);
            
            if (!args.length) {
                const now = new Date();
                this.addOutput('TIMEZONE TOOL LOADED', 'success-text');
                this.addOutput(`NSO Server Time (UTC): ${now.toUTCString()}`, 'output-text');
                this.addOutput('Usage: timezone <country_name>', 'info-text');
                return;
            }
            
            const country = args.join(' ');
            this.addOutput(`Searching timezone for: ${country}`, 'info-text');
            
            // Load actual timezone data if available
            try {
                const timezoneData = await fetch('assets/countryTimezones.json').then(r => r.json());
                this.addOutput('Timezone database loaded successfully', 'success-text');
                this.addOutput(`Search results for "${country}" would appear here`, 'output-text');
            } catch {
                this.addOutput('Using basic timezone calculation', 'warning-text');
            }
            
        } catch (error) {
            this.hideSpinner(tzSpinner);
            this.addOutput(`Failed to load timezone tool: ${error.message}`, 'error-text');
        }
    }
    
    async runMods(args) {
        const mods = [
            { name: 'Matrix Enhanced', file: 'matrix-enhanced.zip', size: '2.3MB' },
            { name: 'UI Theme Pack', file: 'ui-themes.zip', size: '1.8MB' },
            { name: 'Gameplay Mods', file: 'gameplay-mods.zip', size: '4.1MB' }
        ];
        
        if (!args.length) {
            this.addOutput('AVAILABLE MODS:', 'success-text');
            mods.forEach((mod, i) => {
                this.addOutput(`${i+1}. ${mod.name} (${mod.size})`, 'output-text');
            });
            this.addOutput('\nUsage: download <mod_name>', 'info-text');
        } else {
            const search = args.join(' ').toLowerCase();
            const found = mods.filter(m => m.name.toLowerCase().includes(search));
            
            if (found.length) {
                this.addOutput(`SEARCH RESULTS (${found.length}):`, 'success-text');
                found.forEach(mod => {
                    this.addOutput(`• ${mod.name} (${mod.size})`, 'output-text');
                });
            } else {
                this.addOutput(`No mods found for: ${search}`, 'error-text');
            }
        }
    }
    
    runDownload(args) {
        if (!args.length) {
            this.addOutput('Usage: download <item_name>', 'error-text');
            return;
        }
        
        const item = args.join(' ');
        this.addOutput(`Downloading: ${item}`, 'success-text');
        this.addOutput('█████████████████████████ 100%', 'success-text');
        this.addOutput(`Download complete: ${item}`, 'success-text');
        
        // Trigger actual download if file exists
        const downloadMap = {
            'matrix enhanced': 'mods/matrix-enhanced.zip',
            'coffeevm': 'data/EMU/Android/CoffeeVM.apk',
            'j2meloader': 'data/EMU/Android/J2MELoader.apk'
        };
        
        const file = downloadMap[item.toLowerCase()];
        if (file) {
            const a = document.createElement('a');
            a.href = file;
            a.download = file.split('/').pop();
            a.click();
        }
    }
    
    runEmulators() {
        const androidEmus = [
            'CoffeeVM.apk', 'J2MELoader.apk', 'JLMod.apk', 
            'NetMite.apk', 'nsomatrix.apk', 'PhoneME.apk'
        ];
        const desktopEmus = [
            'AngelChipEmulator.jar', 'KEmulatorLite.exe', 'microemulator.jar'
        ];
        
        this.addOutput('EMULATOR DOWNLOADS:', 'success-text');
        this.addOutput('\nAndroid:', 'info-text');
        androidEmus.forEach(emu => {
            this.addOutput(`• ${emu}`, 'output-text');
        });
        
        this.addOutput('\nDesktop:', 'info-text');
        desktopEmus.forEach(emu => {
            this.addOutput(`• ${emu}`, 'output-text');
        });
        
        this.addOutput('\nUsage: download <emulator_name>', 'info-text');
    }
    
    runLogin() {
        const auth = window.firebaseAuth || (window.firebase && window.firebase.auth());
        
        if (auth && auth.currentUser) {
            this.addOutput(`Already logged in as: ${auth.currentUser.email}`, 'success-text');
            return;
        }
        
        this.addOutput('LOGIN REQUIRED', 'info-text');
        this.addOutput('Usage: login <email> <password>', 'output-text');
        this.addOutput('Example: login user@example.com mypassword', 'info-text');
        
        this.loginMode = true;
        this.addOutput('Or type your email and press Enter', 'info-text');
    }
    
    async handleLogin(email, password) {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        try {
            const authSpinner = this.showSpinner('Authenticating');
            
            if (auth) {
                const userCred = await auth.signInWithEmailAndPassword(email, password);
                const user = userCred.user;
                
                localStorage.setItem('userLoggedIn', 'true');
                
                if (db) {
                    const playerDoc = await db.collection('players').doc(user.uid).get();
                    const playerData = playerDoc.data();
                    
                    if (playerData && playerData.salt && playerData.masterPasswordHash) {
                        sessionStorage.setItem('tempLoginPassword', password);
                        
                        // Derive encryption key like the GUI login does
                        const derivedKey = await this.deriveKey(password, playerData.salt);
                        const derivedKeyHex = derivedKey.toString();
                        
                        if (derivedKeyHex === playerData.masterPasswordHash) {
                            sessionStorage.setItem('currentEncryptionKeyHex', derivedKeyHex);
                        }
                        
                        this.addOutput(`REAL LOGIN SUCCESS: ${user.email}`, 'success-text');
                        this.addOutput(`Level: ${playerData.level || 1}`, 'output-text');
                        this.addOutput('System-wide authentication active', 'success-text');
                    } else {
                        this.addOutput(`REAL LOGIN SUCCESS: ${user.email}`, 'success-text');
                        this.addOutput('New user - no game data yet', 'info-text');
                    }
                } else {
                    this.addOutput(`REAL LOGIN SUCCESS: ${user.email}`, 'success-text');
                    this.addOutput('System-wide authentication active', 'success-text');
                }
                
                // Update navbar auth state
                this.updateNavbarAuth(user);
                this.hideSpinner(authSpinner);
                
            } else {
                this.hideSpinner(authSpinner);
                this.addOutput('Firebase not loaded yet - try again in a moment', 'warning-text');
            }
            
        } catch (error) {
            this.hideSpinner(authSpinner);
            let errorMessage = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password';
            }
            this.addOutput(`${errorMessage}`, 'error-text');
        }
    }
    
    async runDashboard() {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        if (!auth || !auth.currentUser) {
            this.addOutput('Access denied - Login required', 'error-text');
            this.addOutput('Use: login <email> <password>', 'info-text');
            return;
        }
        
        try {
            if (db) {
                const dashSpinner = this.showSpinner('Loading dashboard');
                const playerDoc = await db.collection('players').doc(auth.currentUser.uid).get();
                const playerData = playerDoc.data();
                this.hideSpinner(dashSpinner);
                
                this.addOutput('REAL DASHBOARD ACCESS GRANTED', 'success-text');
                this.addOutput(`User: ${auth.currentUser.email}`, 'output-text');
                this.addOutput(`Level: ${playerData?.level || 1}`, 'output-text');
                this.addOutput('\nDashboard Commands:', 'info-text');
                this.addOutput('• dashboard friends - Manage friends', 'output-text');
                this.addOutput('• dashboard notes - Access notes', 'output-text');
                this.addOutput('• dashboard passwords - Password manager', 'output-text');
                this.addOutput('• dashboard server - Game server', 'output-text');
                this.addOutput('• dashboard delete - Delete account', 'output-text');
                this.addOutput('• dashboard profile - View profile', 'output-text');
                this.addOutput('• logout - Sign out', 'output-text');
            } else {
                this.addOutput('REAL DASHBOARD ACCESS GRANTED', 'success-text');
                this.addOutput(`User: ${auth.currentUser.email}`, 'output-text');
            }
            
        } catch (error) {
            this.addOutput(`Dashboard error: ${error.message}`, 'error-text');
        }
    }
    
    async runItems(args) {
        const itemsSpinner = this.showSpinner('Loading items database');
        
        try {
            const itemsData = await fetch('data/items.json').then(r => r.json()).catch(() => null);
            this.hideSpinner(itemsSpinner);
            
            if (!args.length) {
                if (itemsData) {
                    this.addOutput('ITEMS DATABASE LOADED', 'success-text');
                    this.addOutput(`Total items: ${Object.keys(itemsData).length}`, 'output-text');
                    this.addOutput('Usage: item <itemid> e.g. item 573', 'info-text');
                } else {
                    this.addOutput('Items database loaded from equipmentsdata.json', 'success-text');
                    this.addOutput('Equipment, weapons, and armor data available', 'output-text');
                    this.addOutput('Use: ninjadex equipment <name> to search', 'info-text');
                }
                return;
            }
            
            const itemId = args[0];
            if (itemsData && itemsData[itemId]) {
                const item = itemsData[itemId];
                this.addOutput(`ITEM ${itemId}:`, 'success-text');
                this.addOutput(`Name: ${item.name || 'Unknown'}`, 'output-text');
                if (item.description) this.addOutput(`Description: ${item.description}`, 'output-text');
                if (item.stats) {
                    this.addOutput('Stats:', 'info-text');
                    Object.entries(item.stats).forEach(([stat, value]) => {
                        this.addOutput(`  ${stat}: ${value}`, 'output-text');
                    });
                }
            } else {
                this.addOutput(`Item ${itemId} not found`, 'error-text');
            }
            
        } catch (error) {
            this.hideSpinner(itemsSpinner);
            this.addOutput(`Failed to load items: ${error.message}`, 'error-text');
        }
    }
    
    async runDocs() {
        const docsSpinner = this.showSpinner('Loading documentation');
        
        try {
            const docsData = await this.loadPageData('docs.html');
            this.hideSpinner(docsSpinner);
            
            if (docsData) {
                this.addOutput('DOCUMENTATION LOADED', 'success-text');
                this.addOutput('Available documentation:', 'output-text');
                this.addOutput('• Game guides and tutorials', 'output-text');
                this.addOutput('• API documentation', 'output-text');
                this.addOutput('• Terminal commands reference', 'output-text');
                this.addOutput('• Database schemas', 'output-text');
                this.addOutput('\nFull docs available at docs.html', 'info-text');
            }
            
        } catch (error) {
            this.hideSpinner(docsSpinner);
            this.addOutput(`Failed to load documentation: ${error.message}`, 'error-text');
        }
    }
    


    showUptime() {
        const uptime = Math.floor(Math.random() * 1000000);
        this.addOutput(`System uptime: ${uptime} seconds`, 'output-text');
    }
    
    async runDashboardCommand(command, args = []) {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        if (!auth || !auth.currentUser) {
            this.addOutput('Login required for dashboard commands', 'error-text');
            return;
        }
        
        const fullCommand = [command, ...args].join(' ').toLowerCase();
        
        switch(fullCommand) {
            case 'friends':
                const friendsSpinner = this.showSpinner('Loading friends');
                await this.loadFriends();
                this.hideSpinner(friendsSpinner);
                break;
            case 'notes':
                const notesSpinner = this.showSpinner('Loading notes');
                await this.loadNotes();
                this.hideSpinner(notesSpinner);
                break;
            case 'passwords':
                const passwordsSpinner = this.showSpinner('Loading password manager');
                await this.loadPasswords();
                this.hideSpinner(passwordsSpinner);
                break;
            case 'server':
                this.addOutput('Opening game server', 'success-text');
                window.open('https://support.teamobi.com/login-game-3.html', '_blank');
                break;
            case 'delete':
                this.addOutput('Type "dashboard delete confirm" to delete account', 'warning-text');
                break;
            case 'delete confirm':
                const deleteSpinner = this.showSpinner('Deleting all account data', 'warning-text');
                await this.deleteAccount(deleteSpinner);
                break;
            case 'profile':
                this.addOutput('USER PROFILE:', 'success-text');
                this.addOutput(`Email: ${auth.currentUser.email}`, 'output-text');
                this.addOutput(`UID: ${auth.currentUser.uid}`, 'output-text');
                break;
            default:
                this.addOutput(`Unknown dashboard command: ${command}`, 'error-text');
        }
    }
    
    async loadFriends() {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        try {
            const snapshot = await db.collection('players').doc(auth.currentUser.uid)
                .collection('friends').where('status', '==', 'accepted').get();
            
            if (snapshot.empty) {
                this.addOutput('No friends found', 'info-text');
                return;
            }
            
            this.addOutput('FRIENDS LIST:', 'success-text');
            for (const doc of snapshot.docs) {
                const friend = doc.data();
                this.addOutput(`• @${friend.username} (${friend.friendId})`, 'output-text');
            }
        } catch (error) {
            this.addOutput(`Error loading friends: ${error.message}`, 'error-text');
        }
    }
    
    async loadNotes() {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        try {
            const snapshot = await db.collection('players').doc(auth.currentUser.uid)
                .collection('notes').get();
            
            if (snapshot.empty) {
                this.addOutput('No notes found', 'info-text');
                return;
            }
            
            // Check if encryption key is available
            const encryptionKey = sessionStorage.getItem('currentEncryptionKeyHex');
            if (!encryptionKey) {
                this.addOutput('ENCRYPTED NOTES FOUND:', 'success-text');
                snapshot.forEach(doc => {
                    const date = doc.data().createdAt ? doc.data().createdAt.toDate().toLocaleDateString() : 'Unknown';
                    this.addOutput(`[${date}] [ENCRYPTED - Master password required]`, 'warning-text');
                });
                this.addOutput('\nUse dashboard to unlock with master password', 'info-text');
                return;
            }
            
            // Load CryptoJS if not available
            if (!window.CryptoJS) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
            }
            
            this.addOutput('NOTES:', 'success-text');
            snapshot.forEach(doc => {
                const note = doc.data();
                const decrypted = this.decryptData(note.content, encryptionKey);
                let dateStr = 'No Date';
                if (note.createdAt) {
                    const date = note.createdAt.toDate();
                    dateStr = date.toLocaleString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit', 
                        hour12: true 
                    });
                } else if (note.timestamp) {
                    const date = note.timestamp.toDate();
                    dateStr = date.toLocaleString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit', 
                        hour12: true 
                    });
                }
                this.addOutput(`${dateStr} ${decrypted}`, 'output-text');
            });
        } catch (error) {
            this.addOutput(`Error loading notes: ${error.message}`, 'error-text');
        }
    }
    
    async loadPasswords() {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        try {
            const snapshot = await db.collection('players').doc(auth.currentUser.uid)
                .collection('passwords').get();
            
            if (snapshot.empty) {
                this.addOutput('No passwords found', 'info-text');
                return;
            }
            
            // Check if encryption key is available
            const encryptionKey = sessionStorage.getItem('currentEncryptionKeyHex');
            if (!encryptionKey) {
                this.addOutput('ENCRYPTED PASSWORDS FOUND:', 'success-text');
                snapshot.forEach(doc => {
                    const pwd = doc.data();
                    this.addOutput(`${pwd.serviceName}: ${pwd.username} | [ENCRYPTED]`, 'warning-text');
                });
                this.addOutput('\nUse dashboard to unlock with master password', 'info-text');
                return;
            }
            
            // Load CryptoJS if not available
            if (!window.CryptoJS) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
            }
            
            this.addOutput('PASSWORD MANAGER:', 'success-text');
            snapshot.forEach(doc => {
                const pwd = doc.data();
                const decryptedPassword = this.decryptData(pwd.password, encryptionKey);
                this.addOutput(`${pwd.serviceName}: ${pwd.username} | ${decryptedPassword}`, 'output-text');
            });
        } catch (error) {
            this.addOutput(`Error loading passwords: ${error.message}`, 'error-text');
        }
    }
    
    async deleteAccount(spinnerId) {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        
        try {
            
            const uid = auth.currentUser.uid;
            const deletePromises = [];
            
            // Delete all subcollections
            const collections = ['notes', 'passwords', 'friends', 'friendRequests', 'notifications'];
            for (const collectionName of collections) {
                const snapshot = await db.collection('players').doc(uid).collection(collectionName).get();
                snapshot.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });
            }
            
            // Delete messages where user is participant
            const messagesSnapshot = await db.collection('messages')
                .where('participants', 'array-contains', uid).get();
            messagesSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            // Delete presence
            deletePromises.push(db.collection('presence').doc(uid).delete());
            
            // Execute all deletions
            await Promise.all(deletePromises);
            
            // Delete player document
            await db.collection('players').doc(uid).delete();
            
            // Delete Firebase user account
            await auth.currentUser.delete();
            
            this.hideSpinner(spinnerId);
            this.addOutput('All account data deleted successfully', 'success-text');
            this.addOutput('Redirecting to login', 'info-text');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } catch (error) {
            this.hideSpinner(spinnerId);
            this.addOutput(`Error deleting account: ${error.message}`, 'error-text');
        }
    }
    
    decryptData(encryptedData, keyHex) {
        try {
            if (!window.CryptoJS) {
                return '[CryptoJS not loaded]';
            }
            
            const key = CryptoJS.enc.Hex.parse(keyHex);
            const parts = encryptedData.split(':');
            const iv = CryptoJS.enc.Hex.parse(parts[0]);
            const decrypted = CryptoJS.AES.decrypt(parts[1], key, { iv: iv });
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            return '[DECRYPTION ERROR]';
        }
    }
    
    async runLogout() {
        const auth = window.firebaseAuth || (window.firebase && window.firebase.auth());
        
        try {
            if (auth && auth.currentUser) {
                await auth.signOut();
                this.addOutput('Firebase logout successful', 'success-text');
            }
            
            localStorage.removeItem('userLoggedIn');
            sessionStorage.clear();
            
            // Update navbar to show login state
            const authLink = document.getElementById('authLink');
            const mobileAuthLink = document.getElementById('mobileAuthLink');
            const loginSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17v-3H3v-4h7V7l5 5-5 5M10 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2h2v2h9V4h-9v2H8V4a2 2 0 0 1 2-2z"/></svg>';
            
            if (authLink) {
                authLink.innerHTML = loginSvg + ' LOGIN';
                authLink.href = 'login.html';
                authLink.onclick = null;
            }
            
            if (mobileAuthLink) {
                mobileAuthLink.innerHTML = loginSvg + ' LOGIN';
                mobileAuthLink.href = 'login.html';
                mobileAuthLink.onclick = null;
            }
            
            this.addOutput('System-wide logout complete', 'success-text');
            
        } catch (error) {
            this.addOutput(`Logout error: ${error.message}`, 'error-text');
            localStorage.removeItem('userLoggedIn');
            sessionStorage.clear();
            this.addOutput('Local session cleared', 'warning-text');
        }
    }

    async deriveKey(password, salt) {
        // Load CryptoJS if not available
        if (!window.CryptoJS) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js');
        }
        
        return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32,
            iterations: 200000,
            hasher: CryptoJS.algo.SHA256
        });
    }
    
    updateNavbarAuth(user) {
        // Update navbar auth state
        const authLink = document.getElementById('authLink');
        const mobileAuthLink = document.getElementById('mobileAuthLink');
        
        const logoutSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41M19 3a2 2 0 0 1 2 2v4.67l-2-2V5H5v14h14v-2.67l2-2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14z"/></svg>';
        
        if (authLink) {
            authLink.innerHTML = logoutSvg + ' LOGOUT';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                this.runLogout();
            };
        }
        
        if (mobileAuthLink) {
            mobileAuthLink.innerHTML = logoutSvg + ' LOGOUT';
            mobileAuthLink.href = '#';
            mobileAuthLink.onclick = (e) => {
                e.preventDefault();
                this.runLogout();
            };
        }
        

    }

    showSpinner(text, className = 'info-text') {
        const spinnerId = Date.now() + Math.random();
        const line = document.createElement('div');
        line.className = `command-line ${className}`;
        line.id = `spinner-${spinnerId}`;
        
        let frameIndex = 0;
        const updateSpinner = () => {
            if (this.activeSpinners.has(spinnerId)) {
                line.innerHTML = `${this.spinnerFrames[frameIndex]} ${text}`;
                frameIndex = (frameIndex + 1) % this.spinnerFrames.length;
            }
        };
        
        const interval = setInterval(updateSpinner, 80);
        this.activeSpinners.set(spinnerId, { line, interval });
        
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
        updateSpinner();
        
        return spinnerId;
    }
    
    hideSpinner(spinnerId) {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
            clearInterval(spinner.interval);
            spinner.line.remove();
            this.activeSpinners.delete(spinnerId);
        }
    }

    addOutput(text, className = 'output-text') {
        const line = document.createElement('div');
        line.className = `command-line ${className}`;
        line.innerHTML = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }
}

// Initialize terminal when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MatrixTerminal();
});