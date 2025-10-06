class KinsEstimator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Calculate button
        document.getElementById('calculateKins').addEventListener('click', () => this.calculateKins());

        // Enter key support for inputs
        document.getElementById('kinsPerHour').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateKins();
        });
        document.getElementById('days').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateKins();
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

    parseKinsInput(input) {
        // Remove any spaces and replace periods with empty string for parsing
        // Then convert back to number
        const cleanInput = input.replace(/\s/g, '').replace(/\./g, '');
        return parseFloat(cleanInput) || 0;
    }

    formatKins(number) {
        // Convert number to string and add periods every 3 digits from right
        const numStr = Math.floor(number).toString();
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

        // Calculate totals
        const hoursPerDay = 24;
        const kinsPerDay = kinsPerHour * hoursPerDay;
        const totalKins = kinsPerDay * days;

        // Calculate breakdown
        const kinsPerWeek = kinsPerDay * 7;
        const kinsPerMonth = kinsPerDay * 30; // Approximate month
        const kinsPerYear = kinsPerDay * 365;

        // Display results
        this.displayResults({
            total: totalKins,
            perDay: kinsPerDay,
            perWeek: kinsPerWeek,
            perMonth: kinsPerMonth,
            perYear: kinsPerYear
        });
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KinsEstimator();
});