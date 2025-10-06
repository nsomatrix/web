class KinsEstimator {
    constructor() {
        this.countdownInterval = null;
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

        // Auto-format kins input as user types
        document.getElementById('kinsPerHour').addEventListener('input', (e) => {
            this.formatInputAsType(e.target);
        });

        // Enter key support for inputs
        document.getElementById('kinsPerHour').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateKins();
        });
        document.getElementById('days').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateKins();
        });
        
        // Level estimator enter key support
        ['currentLevel', 'currentExp', 'expPerHour'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.calculateLevel();
            });
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

    formatInputAsType(input) {
        const cursorPos = input.selectionStart;
        const value = input.value.replace(/\D/g, '');
        const formatted = this.formatKins(value);
        input.value = formatted;
        
        // Restore cursor position
        const newPos = Math.min(cursorPos + (formatted.length - input.value.length), formatted.length);
        input.setSelectionRange(newPos, newPos);
    }

    parseKinsInput(input) {
        // Remove any spaces and replace periods with empty string for parsing
        // Then convert back to number
        const cleanInput = input.replace(/\s/g, '').replace(/\./g, '');
        return parseFloat(cleanInput) || 0;
    }

    formatKins(number) {
        // Convert number to string and add periods every 3 digits from right
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
        const kinsPerHourInput = document.getElementById('kinsPerHour').value.trim();
        const daysInput = document.getElementById('days').value.trim();

        // Validation
        if (!kinsPerHourInput || !daysInput) {
            alert('Please fill in both fields');
            return;
        }

        const kinsPerHour = this.parseKinsInput(kinsPerHourInput);
        const days = parseInt(daysInput);

        if (kinsPerHour <= 0 || days <= 0) {
            alert('Please enter valid positive numbers');
            return;
        }

        // Show loading state
        button.classList.add('loading');
        button.disabled = true;

        // Simulate calculation delay
        setTimeout(() => {
            // Calculate totals
            const hoursPerDay = 24;
            const kinsPerDay = kinsPerHour * hoursPerDay;
            const totalKins = kinsPerDay * days;

            // Calculate breakdown
            const kinsPerWeek = kinsPerDay * 7;
            const kinsPerMonth = kinsPerDay * 30;
            const kinsPerYear = kinsPerDay * 365;

            // Display results
            this.displayResults({
                total: totalKins,
                perDay: kinsPerDay,
                perWeek: kinsPerWeek,
                perMonth: kinsPerMonth,
                perYear: kinsPerYear
            });

            // Remove loading state
            button.classList.remove('loading');
            button.disabled = false;
        }, 800);
    }

    displayResults(results) {
        // Show results section
        document.getElementById('kinsResults').style.display = 'block';

        // Update values
        document.getElementById('totalKins').textContent = this.formatKins(results.total) + ' kins';
        document.getElementById('kinsPerDay').textContent = this.formatKins(results.perDay) + ' kins';
        document.getElementById('kinsPerWeek').textContent = this.formatKins(results.perWeek) + ' kins';
        document.getElementById('kinsPerMonth').textContent = this.formatKins(results.perMonth) + ' kins';
        document.getElementById('kinsPerYear').textContent = this.formatKins(results.perYear) + ' kins';

        // Smooth scroll to results
        document.getElementById('kinsResults').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    calculateLevel() {
        const button = document.getElementById('calculateLevel');
        const currentLevel = parseInt(document.getElementById('currentLevel').value);
        const currentExp = parseFloat(document.getElementById('currentExp').value);
        const expPerHour = parseFloat(document.getElementById('expPerHour').value);

        // Validation
        if (!currentLevel || currentExp === '' || !expPerHour) {
            alert('Please fill in all fields');
            return;
        }

        if (currentLevel < 1 || currentLevel > 130) {
            alert('Level must be between 1 and 130');
            return;
        }

        if (currentExp < -50 || currentExp > 99.99) {
            alert('Experience must be between -50.00% and 99.99%');
            return;
        }

        if (expPerHour <= 0) {
            alert('Experience per hour must be positive');
            return;
        }

        // Show loading state
        button.classList.add('loading');
        button.disabled = true;

        setTimeout(() => {
            // Calculate experience needed to reach next level
            const expNeeded = 100 - currentExp;
            const hoursNeeded = expNeeded / expPerHour;
            const secondsNeeded = Math.ceil(hoursNeeded * 3600);

            // Display results
            this.displayLevelResults({
                fromLevel: currentLevel,
                toLevel: currentLevel + 1,
                expNeeded: expNeeded.toFixed(2),
                secondsRemaining: secondsNeeded
            });

            // Remove loading state
            button.classList.remove('loading');
            button.disabled = false;
        }, 500);
    }

    displayLevelResults(results) {
        // Show results section
        document.getElementById('levelResults').style.display = 'block';

        // Update values
        document.getElementById('fromLevel').textContent = `Level ${results.fromLevel}`;
        document.getElementById('toLevel').textContent = `Level ${results.toLevel}`;
        document.getElementById('expNeeded').textContent = `${results.expNeeded}%`;

        // Start countdown
        this.startCountdown(results.secondsRemaining);

        // Smooth scroll to results
        document.getElementById('levelResults').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    startCountdown(seconds) {
        // Clear existing countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        let remainingSeconds = seconds;
        const countdownElement = document.getElementById('countdown');

        const updateCountdown = () => {
            if (remainingSeconds <= 0) {
                countdownElement.textContent = 'Level Up!';
                clearInterval(this.countdownInterval);
                return;
            }

            const days = Math.floor(remainingSeconds / 86400);
            const hours = Math.floor((remainingSeconds % 86400) / 3600);
            const minutes = Math.floor((remainingSeconds % 3600) / 60);
            const secs = remainingSeconds % 60;

            let timeString = '';
            if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''} `;
            if (hours > 0) timeString += `${hours} hour${hours > 1 ? 's' : ''} `;
            if (minutes > 0) timeString += `${minutes} minute${minutes > 1 ? 's' : ''} `;
            timeString += `${secs} second${secs > 1 ? 's' : ''}`;

            countdownElement.textContent = timeString;
            remainingSeconds--;
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KinsEstimator();
});