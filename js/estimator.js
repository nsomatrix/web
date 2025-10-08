class KinsEstimator {
    constructor() {
        this.countdownInterval = null;
        this.calculationData = null;
        this.levelRequirements = null;
        this.loadLevelRequirements();
        this.initializeEventListeners();
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

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Calculate buttons
        document.getElementById('calculateKins').addEventListener('click', () => this.calculateKins());
        document.getElementById('calculateLevel').addEventListener('click', () => this.calculateLevel());

        // Auto-format kins input
        document.getElementById('kinsPerHour').addEventListener('input', (e) => {
            this.formatInputAsType(e.target);
        });

        // Enter key support
        ['kinsPerHour', 'days'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.calculateKins();
            });
        });
        
        ['currentLevel', 'currentExp', 'expPerHour'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.calculateLevel();
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    formatInputAsType(input) {
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

    calculateKins() {
        const button = document.getElementById('calculateKins');
        const kinsPerHour = this.parseKinsInput(document.getElementById('kinsPerHour').value.trim());
        const days = parseInt(document.getElementById('days').value.trim());

        if (!kinsPerHour || !days || kinsPerHour <= 0 || days <= 0) {
            alert('Please enter valid numbers');
            return;
        }

        this.setLoadingState(button, true);

        setTimeout(() => {
            const kinsPerDay = kinsPerHour * 24;
            const totalKins = kinsPerDay * days;

            this.displayResults({
                total: totalKins,
                perDay: kinsPerDay,
                perWeek: kinsPerDay * 7,
                perMonth: kinsPerDay * 30,
                perYear: kinsPerDay * 365
            });

            this.setLoadingState(button, false);
        }, 800);
    }

    calculateLevel() {
        const button = document.getElementById('calculateLevel');
        const currentLevel = parseInt(document.getElementById('currentLevel').value);
        const currentExp = parseFloat(document.getElementById('currentExp').value);
        const expPerHour = parseFloat(document.getElementById('expPerHour').value);

        if (!currentLevel || currentExp === '' || !expPerHour ||
            currentLevel < 1 || currentLevel > 130 ||
            currentExp < -50 || currentExp > 99.99 ||
            expPerHour <= 0) {
            alert('Please enter valid values within the specified ranges');
            return;
        }

        this.setLoadingState(button, true);

        setTimeout(() => {
            if (!this.levelRequirements) {
                alert('Level data not loaded yet. Please try again.');
                this.setLoadingState(button, false);
                return;
            }

            const expNeeded = 100 - currentExp;
            const secondsNeeded = Math.ceil((expNeeded / expPerHour) * 3600);
            
            const currentLevelTotalExp = this.levelRequirements[currentLevel.toString()] || 0;
            const nextLevelTotalExp = this.levelRequirements[(currentLevel + 1).toString()] || 0;
            const expForThisLevel = nextLevelTotalExp - currentLevelTotalExp;
            const actualExpNeeded = Math.ceil((expNeeded / 100) * expForThisLevel);

            this.calculationData = { 
                expNeeded: expNeeded, 
                expPerHour,
                actualExpNeeded,
                expForThisLevel
            };

            this.displayLevelResults({
                fromLevel: currentLevel,
                toLevel: currentLevel + 1,
                expNeeded: (100 - currentExp).toFixed(2),
                secondsRemaining: secondsNeeded
            });

            this.setLoadingState(button, false);
        }, 500);
    }

    setLoadingState(button, loading) {
        button.classList.toggle('loading', loading);
        button.disabled = loading;
    }

    displayResults(results) {
        document.getElementById('kinsResults').style.display = 'block';
        
        Object.entries(results).forEach(([key, value]) => {
            const element = document.getElementById(key === 'total' ? 'totalKins' : `kins${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (element) element.textContent = this.formatKins(value) + ' kins';
        });

        document.getElementById('kinsResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    displayLevelResults(results) {
        document.getElementById('levelResults').style.display = 'block';
        document.getElementById('fromLevel').textContent = `Level ${results.fromLevel}`;
        document.getElementById('toLevel').textContent = `Level ${results.toLevel}`;
        
        if (this.levelRequirements && results.fromLevel < 130) {
            const actualExpNeeded = Math.ceil(this.calculationData.actualExpNeeded);
            document.getElementById('expNeeded').innerHTML = `${results.expNeeded}% (<span class="neon-exp">${actualExpNeeded} EXP</span>)`;
        } else {
            document.getElementById('expNeeded').textContent = `${results.expNeeded}%`;
        }

        this.startCountdown(results.secondsRemaining);
        document.getElementById('levelResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    startCountdown(seconds) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        const countdownElement = document.getElementById('countdown');
        const expNeededElement = document.getElementById('expNeeded');
        const expPerMs = this.calculationData.expPerHour / 3600000;
        let currentExpNeeded = this.calculationData.expNeeded;
        let remainingMs = seconds * 1000;
        let lastDisplayedText = '';

        const updateCountdown = () => {
            if (remainingMs <= 0) {
                countdownElement.textContent = 'Level Up!';
                if (this.levelRequirements) {
                    expNeededElement.textContent = '0.00% (0 EXP)';
                } else {
                    expNeededElement.textContent = '0.00%';
                }
                clearInterval(this.countdownInterval);
                return;
            }

            const totalSeconds = Math.floor(remainingMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;

            let timeString = '';
            if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''} `;
            if (hours > 0) timeString += `${hours} hour${hours > 1 ? 's' : ''} `;
            if (minutes > 0) timeString += `${minutes} minute${minutes > 1 ? 's' : ''} `;
            timeString += `${secs} second${secs > 1 ? 's' : ''}`;

            countdownElement.textContent = timeString;
            
            currentExpNeeded -= expPerMs * 100;
            const currentPercentage = Math.max(0, currentExpNeeded);
            const displayedPercentage = currentPercentage.toFixed(2);
            const percentageChanged = displayedPercentage !== lastDisplayedText;
            
            if (this.levelRequirements) {
                const actualExpRemaining = Math.ceil((currentPercentage / 100) * this.calculationData.expForThisLevel);
                const flashClass = percentageChanged ? 'flash-red' : '';
                expNeededElement.innerHTML = `<span class="${flashClass}">${displayedPercentage}%</span> (<span class="neon-exp">${Math.max(0, actualExpRemaining)} EXP</span>)`;
            } else {
                const flashClass = percentageChanged ? 'flash-red' : '';
                expNeededElement.innerHTML = `<span class="${flashClass}">${displayedPercentage}%</span>`;
            }
            
            lastDisplayedText = displayedPercentage;
            
            remainingMs -= 100;
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => new KinsEstimator());