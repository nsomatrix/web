// Commands Handler - NSO Commands Page
class CommandsHandler {
    constructor() {
        this.commands = [];
        this.filteredCommands = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        try {
            await this.loadCommands();
            this.setupEventListeners();
            this.renderCommands();
            this.updateStats();
        } catch (error) {
            console.error('Error initializing commands:', error);
            this.showError('Failed to load commands');
        }
    }

    async loadCommands() {
        try {
            const response = await fetch('../data/json/nsocommands.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Flatten commands from all categories
            this.commands = [];
            Object.keys(data.codes).forEach(category => {
                data.codes[category].forEach(command => {
                    this.commands.push({
                        ...command,
                        category: category
                    });
                });
            });
            
            this.metadata = data.metadata;
            this.filteredCommands = [...this.commands];
            
        } catch (error) {
            console.error('Error loading commands:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Category filter buttons
        document.querySelectorAll('.filter-tab').forEach(button => {
            button.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.applyFilters();
    }

    applyFilters() {
        this.filteredCommands = this.commands.filter(command => {
            // Category filter
            const categoryMatch = this.currentCategory === 'all' || command.category === this.currentCategory;
            
            // Search filter
            const searchMatch = !this.searchTerm || 
                command.command.toLowerCase().includes(this.searchTerm) ||
                command.description.toLowerCase().includes(this.searchTerm) ||
                (command.example && command.example.toLowerCase().includes(this.searchTerm));
            
            return categoryMatch && searchMatch;
        });
        
        this.renderCommands();
    }

    renderCommands() {
        const container = document.getElementById('commandsList');
        
        if (this.filteredCommands.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5,14H20.5L22,15.5V20.5L20.5,22H15.5L14,20.5V15.5L15.5,14M16,16V20H20V16H16M10.5,18H12.5V20H10.5V18M6.5,16H8.5V18H6.5V16M2.5,14H4.5V16H2.5V14M21.47,4.73L19.86,3.12C19.54,2.8 19.02,2.8 18.7,3.12L17.29,4.53L21.47,8.71L22.88,7.3C23.2,6.98 23.2,6.46 22.88,6.14L21.47,4.73M16.22,5.6L2,19.82V24H6.18L20.4,9.78L16.22,5.6Z"/>
                    </svg>
                    <h3>No commands found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }

        // Desktop table view
        const tableHTML = `
            <table class="file-table">
                <thead>
                    <tr>
                        <th>Command</th>
                        <th>Category</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredCommands.map(command => this.renderCommandRow(command)).join('')}
                </tbody>
            </table>
        `;

        // Mobile card view
        const mobileHTML = `
            <div class="mobile-commands-grid">
                ${this.filteredCommands.map(command => this.renderMobileCommandCard(command)).join('')}
            </div>
        `;
        
        container.innerHTML = tableHTML + mobileHTML;
        
        // Add copy button event listeners
        this.setupCopyButtons();
    }

    renderCommandRow(command) {
        const categoryIcon = this.getCategoryIcon(command.category);
        const commandInitial = command.command.charAt(0).toUpperCase();
        
        return `
            <tr>
                <td>
                    <div class="command-name-cell">
                        <div class="command-icon">${commandInitial}</div>
                        <div class="command-details">
                            <div class="command-name">${this.escapeHtml(command.command)}</div>
                            <div class="command-description">${this.escapeHtml(command.description)}</div>
                            ${command.example ? `<div class="command-example">Example: ${this.escapeHtml(command.example)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="category-badge ${command.category}">
                        ${categoryIcon}
                        ${this.formatCategoryName(command.category)}
                    </div>
                </td>
                <td>
                    <button class="copy-button" data-command="${this.escapeHtml(command.command)}" title="Copy command">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }

    renderMobileCommandCard(command) {
        const categoryIcon = this.getCategoryIcon(command.category);
        const commandInitial = command.command.charAt(0).toUpperCase();
        
        return `
            <div class="mobile-command-card">
                <div class="mobile-command-header">
                    <div class="mobile-command-icon">${commandInitial}</div>
                    <div class="mobile-command-info">
                        <div class="mobile-command-name">${this.escapeHtml(command.command)}</div>
                        <div class="mobile-command-description">${this.escapeHtml(command.description)}</div>
                        ${command.example ? `<div class="mobile-command-example">Example: ${this.escapeHtml(command.example)}</div>` : ''}
                    </div>
                </div>
                <div class="mobile-command-footer">
                    <div class="mobile-category-badge ${command.category}">
                        ${categoryIcon}
                        ${this.formatCategoryName(command.category)}
                    </div>
                    <button class="mobile-copy-button" data-command="${this.escapeHtml(command.command)}" title="Copy command">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            general: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>',
            nsotien: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/></svg>',
            trungduc: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2M12,21L10.91,14.74L2,14L10.91,13.26L12,7L13.09,13.26L22,14L13.09,14.74L12,21Z"/></svg>'
        };
        return icons[category] || icons.general;
    }

    formatCategoryName(category) {
        const names = {
            general: 'General',
            nsotien: 'NSO Tien',
            trungduc: 'Trung Duc'
        };
        return names[category] || category;
    }

    setupCopyButtons() {
        // Desktop copy buttons
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const command = e.currentTarget.dataset.command;
                await this.copyToClipboard(command, e.currentTarget);
            });
        });

        // Mobile copy buttons
        document.querySelectorAll('.mobile-copy-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const command = e.currentTarget.dataset.command;
                await this.copyToClipboard(command, e.currentTarget);
            });
        });
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            button.classList.add('copied');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                </svg>
            `;
            
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                `;
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            this.fallbackCopyTextToClipboard(text);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    }

    updateStats() {
        if (!this.metadata) return;
        
        // Show stats section
        const statsSection = document.getElementById('statsSection');
        if (statsSection) {
            statsSection.style.display = 'flex';
        }
        
        // Update counters
        this.animateCounter('totalCommands', this.metadata.total_codes);
        this.animateCounter('generalCount', this.metadata.general_count);
        this.animateCounter('nsotienCount', this.metadata.nsotien_count);
        this.animateCounter('trungducCount', this.metadata.trungduc_count);
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        let currentValue = 0;
        const increment = Math.ceil(targetValue / 30);
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = currentValue;
        }, 50);
    }

    showError(message) {
        const container = document.getElementById('commandsList');
        container.innerHTML = `
            <div class="error-message">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                </svg>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CommandsHandler();
});