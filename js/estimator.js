class KinsEstimator {
    constructor() {
        this.countdownInterval = null;
        this.calculationData = null;
        this.initializeEventListeners();
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
            alert('Please enter valid positive numbers');
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
            const expNeeded = 100 - currentExp;
            const secondsNeeded = Math.ceil((expNeeded / expPerHour) * 3600);

            this.calculationData = { expNeeded, expPerHour };

            this.displayLevelResults({
                fromLevel: currentLevel,
                toLevel: currentLevel + 1,
                expNeeded: expNeeded.toFixed(2),
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
        document.getElementById('expNeeded').textContent = `${results.expNeeded}%`;

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

        const updateCountdown = () => {
            if (remainingMs <= 0) {
                countdownElement.textContent = 'Level Up!';
                expNeededElement.textContent = '0.00%';
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
            expNeededElement.textContent = `${Math.max(0, currentExpNeeded).toFixed(2)}%`;
            
            remainingMs -= 100;
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => new KinsEstimator());