const countries = [
    { name: "Afghanistan", timezone: "Asia/Kabul", flag: "af" },
    { name: "Albania", timezone: "Europe/Tirane", flag: "al" },
    { name: "Algeria", timezone: "Africa/Algiers", flag: "dz" },
    { name: "Andorra", timezone: "Europe/Andorra", flag: "ad" },
    { name: "Angola", timezone: "Africa/Luanda", flag: "ao" },
    { name: "Argentina", timezone: "America/Argentina/Buenos_Aires", flag: "ar" },
    { name: "Armenia", timezone: "Asia/Yerevan", flag: "am" },
    { name: "Australia (Sydney)", timezone: "Australia/Sydney", flag: "au" },
    { name: "Australia (Perth)", timezone: "Australia/Perth", flag: "au" },
    { name: "Austria", timezone: "Europe/Vienna", flag: "at" },
    { name: "Azerbaijan", timezone: "Asia/Baku", flag: "az" },
    { name: "Bahrain", timezone: "Asia/Bahrain", flag: "bh" },
    { name: "Bangladesh", timezone: "Asia/Dhaka", flag: "bd" },
    { name: "Belarus", timezone: "Europe/Minsk", flag: "by" },
    { name: "Belgium", timezone: "Europe/Brussels", flag: "be" },
    { name: "Belize", timezone: "America/Belize", flag: "bz" },
    { name: "Benin", timezone: "Africa/Porto-Novo", flag: "bj" },
    { name: "Bhutan", timezone: "Asia/Thimphu", flag: "bt" },
    { name: "Bolivia", timezone: "America/La_Paz", flag: "bo" },
    { name: "Bosnia and Herzegovina", timezone: "Europe/Sarajevo", flag: "ba" },
    { name: "Botswana", timezone: "Africa/Gaborone", flag: "bw" },
    { name: "Brazil (São Paulo)", timezone: "America/Sao_Paulo", flag: "br" },
    { name: "Brazil (Manaus)", timezone: "America/Manaus", flag: "br" },
    { name: "Brunei", timezone: "Asia/Brunei", flag: "bn" },
    { name: "Bulgaria", timezone: "Europe/Sofia", flag: "bg" },
    { name: "Burkina Faso", timezone: "Africa/Ouagadougou", flag: "bf" },
    { name: "Burundi", timezone: "Africa/Bujumbura", flag: "bi" },
    { name: "Cambodia", timezone: "Asia/Phnom_Penh", flag: "kh" },
    { name: "Cameroon", timezone: "Africa/Douala", flag: "cm" },
    { name: "Canada (Toronto)", timezone: "America/Toronto", flag: "ca" },
    { name: "Canada (Vancouver)", timezone: "America/Vancouver", flag: "ca" },
    { name: "Cape Verde", timezone: "Atlantic/Cape_Verde", flag: "cv" },
    { name: "Central African Republic", timezone: "Africa/Bangui", flag: "cf" },
    { name: "Chad", timezone: "Africa/Ndjamena", flag: "td" },
    { name: "Chile", timezone: "America/Santiago", flag: "cl" },
    { name: "China", timezone: "Asia/Shanghai", flag: "cn" },
    { name: "Colombia", timezone: "America/Bogota", flag: "co" },
    { name: "Comoros", timezone: "Indian/Comoro", flag: "km" },
    { name: "Congo", timezone: "Africa/Brazzaville", flag: "cg" },
    { name: "Costa Rica", timezone: "America/Costa_Rica", flag: "cr" },
    { name: "Croatia", timezone: "Europe/Zagreb", flag: "hr" },
    { name: "Cuba", timezone: "America/Havana", flag: "cu" },
    { name: "Cyprus", timezone: "Asia/Nicosia", flag: "cy" },
    { name: "Czech Republic", timezone: "Europe/Prague", flag: "cz" },
    { name: "Denmark", timezone: "Europe/Copenhagen", flag: "dk" },
    { name: "Djibouti", timezone: "Africa/Djibouti", flag: "dj" },
    { name: "Dominican Republic", timezone: "America/Santo_Domingo", flag: "do" },
    { name: "Ecuador", timezone: "America/Guayaquil", flag: "ec" },
    { name: "Egypt", timezone: "Africa/Cairo", flag: "eg" },
    { name: "El Salvador", timezone: "America/El_Salvador", flag: "sv" },
    { name: "Equatorial Guinea", timezone: "Africa/Malabo", flag: "gq" },
    { name: "Eritrea", timezone: "Africa/Asmara", flag: "er" },
    { name: "Estonia", timezone: "Europe/Tallinn", flag: "ee" },
    { name: "Ethiopia", timezone: "Africa/Addis_Ababa", flag: "et" },
    { name: "Fiji", timezone: "Pacific/Fiji", flag: "fj" },
    { name: "Finland", timezone: "Europe/Helsinki", flag: "fi" },
    { name: "France", timezone: "Europe/Paris", flag: "fr" },
    { name: "Gabon", timezone: "Africa/Libreville", flag: "ga" },
    { name: "Gambia", timezone: "Africa/Banjul", flag: "gm" },
    { name: "Georgia", timezone: "Asia/Tbilisi", flag: "ge" },
    { name: "Germany", timezone: "Europe/Berlin", flag: "de" },
    { name: "Ghana", timezone: "Africa/Accra", flag: "gh" },
    { name: "Greece", timezone: "Europe/Athens", flag: "gr" },
    { name: "Greenland", timezone: "America/Godthab", flag: "gl" },
    { name: "Guatemala", timezone: "America/Guatemala", flag: "gt" },
    { name: "Guinea", timezone: "Africa/Conakry", flag: "gn" },
    { name: "Guinea-Bissau", timezone: "Africa/Bissau", flag: "gw" },
    { name: "Guyana", timezone: "America/Guyana", flag: "gy" },
    { name: "Haiti", timezone: "America/Port-au-Prince", flag: "ht" },
    { name: "Honduras", timezone: "America/Tegucigalpa", flag: "hn" },
    { name: "Hungary", timezone: "Europe/Budapest", flag: "hu" },
    { name: "Iceland", timezone: "Atlantic/Reykjavik", flag: "is" },
    { name: "India", timezone: "Asia/Kolkata", flag: "in" },
    { name: "Indonesia (Jakarta)", timezone: "Asia/Jakarta", flag: "id" },
    { name: "Indonesia (Jayapura)", timezone: "Asia/Jayapura", flag: "id" },
    { name: "Iran", timezone: "Asia/Tehran", flag: "ir" },
    { name: "Iraq", timezone: "Asia/Baghdad", flag: "iq" },
    { name: "Ireland", timezone: "Europe/Dublin", flag: "ie" },
    { name: "Israel", timezone: "Asia/Jerusalem", flag: "il" },
    { name: "Italy", timezone: "Europe/Rome", flag: "it" },
    { name: "Ivory Coast", timezone: "Africa/Abidjan", flag: "ci" },
    { name: "Jamaica", timezone: "America/Jamaica", flag: "jm" },
    { name: "Japan", timezone: "Asia/Tokyo", flag: "jp" },
    { name: "Jordan", timezone: "Asia/Amman", flag: "jo" },
    { name: "Kazakhstan (Almaty)", timezone: "Asia/Almaty", flag: "kz" },
    { name: "Kenya", timezone: "Africa/Nairobi", flag: "ke" },
    { name: "Kuwait", timezone: "Asia/Kuwait", flag: "kw" },
    { name: "Kyrgyzstan", timezone: "Asia/Bishkek", flag: "kg" },
    { name: "Laos", timezone: "Asia/Vientiane", flag: "la" },
    { name: "Latvia", timezone: "Europe/Riga", flag: "lv" },
    { name: "Lebanon", timezone: "Asia/Beirut", flag: "lb" },
    { name: "Lesotho", timezone: "Africa/Maseru", flag: "ls" },
    { name: "Liberia", timezone: "Africa/Monrovia", flag: "lr" },
    { name: "Libya", timezone: "Africa/Tripoli", flag: "ly" },
    { name: "Liechtenstein", timezone: "Europe/Vaduz", flag: "li" },
    { name: "Lithuania", timezone: "Europe/Vilnius", flag: "lt" },
    { name: "Luxembourg", timezone: "Europe/Luxembourg", flag: "lu" },
    { name: "Madagascar", timezone: "Indian/Antananarivo", flag: "mg" },
    { name: "Malawi", timezone: "Africa/Blantyre", flag: "mw" },
    { name: "Malaysia", timezone: "Asia/Kuala_Lumpur", flag: "my" },
    { name: "Maldives", timezone: "Indian/Maldives", flag: "mv" },
    { name: "Mali", timezone: "Africa/Bamako", flag: "ml" },
    { name: "Malta", timezone: "Europe/Malta", flag: "mt" },
    { name: "Mauritania", timezone: "Africa/Nouakchott", flag: "mr" },
    { name: "Mauritius", timezone: "Indian/Mauritius", flag: "mu" },
    { name: "Mexico (Mexico City)", timezone: "America/Mexico_City", flag: "mx" },
    { name: "Mexico (Tijuana)", timezone: "America/Tijuana", flag: "mx" },
    { name: "Moldova", timezone: "Europe/Chisinau", flag: "md" },
    { name: "Monaco", timezone: "Europe/Monaco", flag: "mc" },
    { name: "Mongolia", timezone: "Asia/Ulaanbaatar", flag: "mn" },
    { name: "Montenegro", timezone: "Europe/Podgorica", flag: "me" },
    { name: "Morocco", timezone: "Africa/Casablanca", flag: "ma" },
    { name: "Mozambique", timezone: "Africa/Maputo", flag: "mz" },
    { name: "Myanmar", timezone: "Asia/Yangon", flag: "mm" },
    { name: "Namibia", timezone: "Africa/Windhoek", flag: "na" },
    { name: "Nepal", timezone: "Asia/Kathmandu", flag: "np" },
    { name: "Netherlands", timezone: "Europe/Amsterdam", flag: "nl" },
    { name: "New Zealand", timezone: "Pacific/Auckland", flag: "nz" },
    { name: "Nicaragua", timezone: "America/Managua", flag: "ni" },
    { name: "Niger", timezone: "Africa/Niamey", flag: "ne" },
    { name: "Nigeria", timezone: "Africa/Lagos", flag: "ng" },
    { name: "North Korea", timezone: "Asia/Pyongyang", flag: "kp" },
    { name: "North Macedonia", timezone: "Europe/Skopje", flag: "mk" },
    { name: "Norway", timezone: "Europe/Oslo", flag: "no" },
    { name: "Oman", timezone: "Asia/Muscat", flag: "om" },
    { name: "Pakistan", timezone: "Asia/Karachi", flag: "pk" },
    { name: "Panama", timezone: "America/Panama", flag: "pa" },
    { name: "Papua New Guinea", timezone: "Pacific/Port_Moresby", flag: "pg" },
    { name: "Paraguay", timezone: "America/Asuncion", flag: "py" },
    { name: "Peru", timezone: "America/Lima", flag: "pe" },
    { name: "Philippines", timezone: "Asia/Manila", flag: "ph" },
    { name: "Poland", timezone: "Europe/Warsaw", flag: "pl" },
    { name: "Portugal", timezone: "Europe/Lisbon", flag: "pt" },
    { name: "Qatar", timezone: "Asia/Qatar", flag: "qa" },
    { name: "Romania", timezone: "Europe/Bucharest", flag: "ro" },
    { name: "Russia (Moscow)", timezone: "Europe/Moscow", flag: "ru" },
    { name: "Russia (Vladivostok)", timezone: "Asia/Vladivostok", flag: "ru" },
    { name: "Russia (Yekaterinburg)", timezone: "Asia/Yekaterinburg", flag: "ru" },
    { name: "Rwanda", timezone: "Africa/Kigali", flag: "rw" },
    { name: "San Marino", timezone: "Europe/San_Marino", flag: "sm" },
    { name: "Saudi Arabia", timezone: "Asia/Riyadh", flag: "sa" },
    { name: "Senegal", timezone: "Africa/Dakar", flag: "sn" },
    { name: "Serbia", timezone: "Europe/Belgrade", flag: "rs" },
    { name: "Seychelles", timezone: "Indian/Mahe", flag: "sc" },
    { name: "Sierra Leone", timezone: "Africa/Freetown", flag: "sl" },
    { name: "Singapore", timezone: "Asia/Singapore", flag: "sg" },
    { name: "Slovakia", timezone: "Europe/Bratislava", flag: "sk" },
    { name: "Slovenia", timezone: "Europe/Ljubljana", flag: "si" },
    { name: "Solomon Islands", timezone: "Pacific/Guadalcanal", flag: "sb" },
    { name: "Somalia", timezone: "Africa/Mogadishu", flag: "so" },
    { name: "South Africa", timezone: "Africa/Johannesburg", flag: "za" },
    { name: "South Korea", timezone: "Asia/Seoul", flag: "kr" },
    { name: "South Sudan", timezone: "Africa/Juba", flag: "ss" },
    { name: "Spain", timezone: "Europe/Madrid", flag: "es" },
    { name: "Sri Lanka", timezone: "Asia/Colombo", flag: "lk" },
    { name: "Sudan", timezone: "Africa/Khartoum", flag: "sd" },
    { name: "Suriname", timezone: "America/Paramaribo", flag: "sr" },
    { name: "Sweden", timezone: "Europe/Stockholm", flag: "se" },
    { name: "Switzerland", timezone: "Europe/Zurich", flag: "ch" },
    { name: "Syria", timezone: "Asia/Damascus", flag: "sy" },
    { name: "Taiwan", timezone: "Asia/Taipei", flag: "tw" },
    { name: "Tajikistan", timezone: "Asia/Dushanbe", flag: "tj" },
    { name: "Tanzania", timezone: "Africa/Dar_es_Salaam", flag: "tz" },
    { name: "Thailand", timezone: "Asia/Bangkok", flag: "th" },
    { name: "Togo", timezone: "Africa/Lome", flag: "tg" },
    { name: "Tonga", timezone: "Pacific/Tongatapu", flag: "to" },
    { name: "Trinidad and Tobago", timezone: "America/Port_of_Spain", flag: "tt" },
    { name: "Tunisia", timezone: "Africa/Tunis", flag: "tn" },
    { name: "Turkey", timezone: "Europe/Istanbul", flag: "tr" },
    { name: "Turkmenistan", timezone: "Asia/Ashgabat", flag: "tm" },
    { name: "Uganda", timezone: "Africa/Kampala", flag: "ug" },
    { name: "Ukraine", timezone: "Europe/Kiev", flag: "ua" },
    { name: "United Arab Emirates", timezone: "Asia/Dubai", flag: "ae" },
    { name: "United Kingdom", timezone: "Europe/London", flag: "gb" },
    { name: "United States (New York)", timezone: "America/New_York", flag: "us" },
    { name: "United States (Los Angeles)", timezone: "America/Los_Angeles", flag: "us" },
    { name: "United States (Chicago)", timezone: "America/Chicago", flag: "us" },
    { name: "United States (Denver)", timezone: "America/Denver", flag: "us" },
    { name: "Uruguay", timezone: "America/Montevideo", flag: "uy" },
    { name: "Uzbekistan", timezone: "Asia/Tashkent", flag: "uz" },
    { name: "Vanuatu", timezone: "Pacific/Efate", flag: "vu" },
    { name: "Vatican City", timezone: "Europe/Vatican", flag: "va" },
    { name: "Venezuela", timezone: "America/Caracas", flag: "ve" },
    { name: "Vietnam", timezone: "Asia/Ho_Chi_Minh", flag: "vn" },
    { name: "Yemen", timezone: "Asia/Aden", flag: "ye" },
    { name: "Zambia", timezone: "Africa/Lusaka", flag: "zm" },
    { name: "Zimbabwe", timezone: "Africa/Harare", flag: "zw" }
];

let searchResults = [];
let comparisonCountries = { country1: null, country2: null };

function populateCountrySelects() {
    const select1 = document.getElementById('country1-select');
    const select2 = document.getElementById('country2-select');
    
    countries.forEach(country => {
        const option1 = document.createElement('option');
        option1.value = JSON.stringify(country);
        option1.textContent = country.name;
        select1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = JSON.stringify(country);
        option2.textContent = country.name;
        select2.appendChild(option2);
    });
}

function updateComparison() {
    if (!comparisonCountries.country1 || !comparisonCountries.country2) {
        document.getElementById('comparison-results').innerHTML = '';
        return;
    }
    
    const now = new Date();
    const container = document.getElementById('comparison-results');
    
    container.innerHTML = `
        <div class="comparison-card">
            <div class="label">
                <img src="https://flagcdn.com/24x18/${comparisonCountries.country1.flag}.png" alt="${comparisonCountries.country1.name}" class="country-flag">
                ${comparisonCountries.country1.name}
            </div>
            <div class="time" id="comp-time-1"></div>
            <div class="date" id="comp-date-1"></div>
        </div>
        <div class="comparison-card">
            <div class="label">
                <img src="https://flagcdn.com/24x18/${comparisonCountries.country2.flag}.png" alt="${comparisonCountries.country2.name}" class="country-flag">
                ${comparisonCountries.country2.name}
            </div>
            <div class="time" id="comp-time-2"></div>
            <div class="date" id="comp-date-2"></div>
        </div>
    `;
    
    updateComparisonTimes();
}

function updateComparisonTimes() {
    if (!comparisonCountries.country1 || !comparisonCountries.country2) return;
    
    const now = new Date();
    
    try {
        const time1 = new Date(now.toLocaleString("en-US", {timeZone: comparisonCountries.country1.timezone}));
        const time2 = new Date(now.toLocaleString("en-US", {timeZone: comparisonCountries.country2.timezone}));
        
        document.getElementById('comp-time-1').textContent = time1.toLocaleTimeString();
        document.getElementById('comp-date-1').textContent = time1.toLocaleDateString();
        document.getElementById('comp-time-2').textContent = time2.toLocaleTimeString();
        document.getElementById('comp-date-2').textContent = time2.toLocaleDateString();
    } catch (error) {
        console.error('Error updating comparison times:', error);
    }
}

function updateUTCTime() {
    const now = new Date();
    document.getElementById('utc-time').textContent = now.toUTCString().slice(17, 25);
    document.getElementById('utc-date').textContent = now.toUTCString().slice(0, 16);
}

function searchCountries(query) {
    if (!query.trim()) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }
    
    const filtered = countries.filter(country => 
        country.name.toLowerCase().includes(query.toLowerCase())
    );
    
    displaySearchResults(filtered);
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    
    results.forEach((country, index) => {
        const div = document.createElement('div');
        div.className = 'country-result';
        div.innerHTML = `
            <div class="label">
                <img src="https://flagcdn.com/24x18/${country.flag}.png" alt="${country.name}" class="country-flag">
                ${country.name}
            </div>
            <div class="time" id="result-time-${index}"></div>
            <div class="date" id="result-date-${index}"></div>
        `;
        container.appendChild(div);
    });
    
    searchResults = results;
    updateSearchResults();
}

function updateSearchResults() {
    const now = new Date();
    
    searchResults.forEach((country, index) => {
        try {
            const localTime = new Date(now.toLocaleString("en-US", {timeZone: country.timezone}));
            const time = localTime.toLocaleTimeString();
            const date = localTime.toLocaleDateString();
            
            const timeEl = document.getElementById(`result-time-${index}`);
            const dateEl = document.getElementById(`result-date-${index}`);
            
            if (timeEl && dateEl) {
                timeEl.textContent = time;
                dateEl.textContent = date;
            }
        } catch (error) {
            const timeEl = document.getElementById(`result-time-${index}`);
            const dateEl = document.getElementById(`result-date-${index}`);
            
            if (timeEl && dateEl) {
                timeEl.textContent = 'N/A';
                dateEl.textContent = 'N/A';
            }
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('country-search');
    const select1 = document.getElementById('country1-select');
    const select2 = document.getElementById('country2-select');
    
    populateCountrySelects();
    
    searchInput.addEventListener('input', function() {
        searchCountries(this.value);
    });
    
    select1.addEventListener('change', function() {
        comparisonCountries.country1 = this.value ? JSON.parse(this.value) : null;
        updateComparison();
    });
    
    select2.addEventListener('change', function() {
        comparisonCountries.country2 = this.value ? JSON.parse(this.value) : null;
        updateComparison();
    });
    
    updateUTCTime();
    setInterval(() => {
        updateUTCTime();
        updateSearchResults();
        updateComparisonTimes();
    }, 1000);
});
