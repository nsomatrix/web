const countries = [
    { name: "Afghanistan", timezone: "Asia/Kabul" },
    { name: "Albania", timezone: "Europe/Tirane" },
    { name: "Algeria", timezone: "Africa/Algiers" },
    { name: "Andorra", timezone: "Europe/Andorra" },
    { name: "Angola", timezone: "Africa/Luanda" },
    { name: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
    { name: "Armenia", timezone: "Asia/Yerevan" },
    { name: "Australia (Sydney)", timezone: "Australia/Sydney" },
    { name: "Australia (Perth)", timezone: "Australia/Perth" },
    { name: "Austria", timezone: "Europe/Vienna" },
    { name: "Azerbaijan", timezone: "Asia/Baku" },
    { name: "Bahrain", timezone: "Asia/Bahrain" },
    { name: "Bangladesh", timezone: "Asia/Dhaka" },
    { name: "Belarus", timezone: "Europe/Minsk" },
    { name: "Belgium", timezone: "Europe/Brussels" },
    { name: "Belize", timezone: "America/Belize" },
    { name: "Benin", timezone: "Africa/Porto-Novo" },
    { name: "Bhutan", timezone: "Asia/Thimphu" },
    { name: "Bolivia", timezone: "America/La_Paz" },
    { name: "Bosnia and Herzegovina", timezone: "Europe/Sarajevo" },
    { name: "Botswana", timezone: "Africa/Gaborone" },
    { name: "Brazil (São Paulo)", timezone: "America/Sao_Paulo" },
    { name: "Brazil (Manaus)", timezone: "America/Manaus" },
    { name: "Brunei", timezone: "Asia/Brunei" },
    { name: "Bulgaria", timezone: "Europe/Sofia" },
    { name: "Burkina Faso", timezone: "Africa/Ouagadougou" },
    { name: "Burundi", timezone: "Africa/Bujumbura" },
    { name: "Cambodia", timezone: "Asia/Phnom_Penh" },
    { name: "Cameroon", timezone: "Africa/Douala" },
    { name: "Canada (Toronto)", timezone: "America/Toronto" },
    { name: "Canada (Vancouver)", timezone: "America/Vancouver" },
    { name: "Cape Verde", timezone: "Atlantic/Cape_Verde" },
    { name: "Central African Republic", timezone: "Africa/Bangui" },
    { name: "Chad", timezone: "Africa/Ndjamena" },
    { name: "Chile", timezone: "America/Santiago" },
    { name: "China", timezone: "Asia/Shanghai" },
    { name: "Colombia", timezone: "America/Bogota" },
    { name: "Comoros", timezone: "Indian/Comoro" },
    { name: "Congo", timezone: "Africa/Brazzaville" },
    { name: "Costa Rica", timezone: "America/Costa_Rica" },
    { name: "Croatia", timezone: "Europe/Zagreb" },
    { name: "Cuba", timezone: "America/Havana" },
    { name: "Cyprus", timezone: "Asia/Nicosia" },
    { name: "Czech Republic", timezone: "Europe/Prague" },
    { name: "Denmark", timezone: "Europe/Copenhagen" },
    { name: "Djibouti", timezone: "Africa/Djibouti" },
    { name: "Dominican Republic", timezone: "America/Santo_Domingo" },
    { name: "Ecuador", timezone: "America/Guayaquil" },
    { name: "Egypt", timezone: "Africa/Cairo" },
    { name: "El Salvador", timezone: "America/El_Salvador" },
    { name: "Equatorial Guinea", timezone: "Africa/Malabo" },
    { name: "Eritrea", timezone: "Africa/Asmara" },
    { name: "Estonia", timezone: "Europe/Tallinn" },
    { name: "Ethiopia", timezone: "Africa/Addis_Ababa" },
    { name: "Fiji", timezone: "Pacific/Fiji" },
    { name: "Finland", timezone: "Europe/Helsinki" },
    { name: "France", timezone: "Europe/Paris" },
    { name: "Gabon", timezone: "Africa/Libreville" },
    { name: "Gambia", timezone: "Africa/Banjul" },
    { name: "Georgia", timezone: "Asia/Tbilisi" },
    { name: "Germany", timezone: "Europe/Berlin" },
    { name: "Ghana", timezone: "Africa/Accra" },
    { name: "Greece", timezone: "Europe/Athens" },
    { name: "Greenland", timezone: "America/Godthab" },
    { name: "Guatemala", timezone: "America/Guatemala" },
    { name: "Guinea", timezone: "Africa/Conakry" },
    { name: "Guinea-Bissau", timezone: "Africa/Bissau" },
    { name: "Guyana", timezone: "America/Guyana" },
    { name: "Haiti", timezone: "America/Port-au-Prince" },
    { name: "Honduras", timezone: "America/Tegucigalpa" },
    { name: "Hungary", timezone: "Europe/Budapest" },
    { name: "Iceland", timezone: "Atlantic/Reykjavik" },
    { name: "India", timezone: "Asia/Kolkata" },
    { name: "Indonesia (Jakarta)", timezone: "Asia/Jakarta" },
    { name: "Indonesia (Jayapura)", timezone: "Asia/Jayapura" },
    { name: "Iran", timezone: "Asia/Tehran" },
    { name: "Iraq", timezone: "Asia/Baghdad" },
    { name: "Ireland", timezone: "Europe/Dublin" },
    { name: "Israel", timezone: "Asia/Jerusalem" },
    { name: "Italy", timezone: "Europe/Rome" },
    { name: "Ivory Coast", timezone: "Africa/Abidjan" },
    { name: "Jamaica", timezone: "America/Jamaica" },
    { name: "Japan", timezone: "Asia/Tokyo" },
    { name: "Jordan", timezone: "Asia/Amman" },
    { name: "Kazakhstan (Almaty)", timezone: "Asia/Almaty" },
    { name: "Kenya", timezone: "Africa/Nairobi" },
    { name: "Kuwait", timezone: "Asia/Kuwait" },
    { name: "Kyrgyzstan", timezone: "Asia/Bishkek" },
    { name: "Laos", timezone: "Asia/Vientiane" },
    { name: "Latvia", timezone: "Europe/Riga" },
    { name: "Lebanon", timezone: "Asia/Beirut" },
    { name: "Lesotho", timezone: "Africa/Maseru" },
    { name: "Liberia", timezone: "Africa/Monrovia" },
    { name: "Libya", timezone: "Africa/Tripoli" },
    { name: "Liechtenstein", timezone: "Europe/Vaduz" },
    { name: "Lithuania", timezone: "Europe/Vilnius" },
    { name: "Luxembourg", timezone: "Europe/Luxembourg" },
    { name: "Madagascar", timezone: "Indian/Antananarivo" },
    { name: "Malawi", timezone: "Africa/Blantyre" },
    { name: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
    { name: "Maldives", timezone: "Indian/Maldives" },
    { name: "Mali", timezone: "Africa/Bamako" },
    { name: "Malta", timezone: "Europe/Malta" },
    { name: "Mauritania", timezone: "Africa/Nouakchott" },
    { name: "Mauritius", timezone: "Indian/Mauritius" },
    { name: "Mexico (Mexico City)", timezone: "America/Mexico_City" },
    { name: "Mexico (Tijuana)", timezone: "America/Tijuana" },
    { name: "Moldova", timezone: "Europe/Chisinau" },
    { name: "Monaco", timezone: "Europe/Monaco" },
    { name: "Mongolia", timezone: "Asia/Ulaanbaatar" },
    { name: "Montenegro", timezone: "Europe/Podgorica" },
    { name: "Morocco", timezone: "Africa/Casablanca" },
    { name: "Mozambique", timezone: "Africa/Maputo" },
    { name: "Myanmar", timezone: "Asia/Yangon" },
    { name: "Namibia", timezone: "Africa/Windhoek" },
    { name: "Nepal", timezone: "Asia/Kathmandu" },
    { name: "Netherlands", timezone: "Europe/Amsterdam" },
    { name: "New Zealand", timezone: "Pacific/Auckland" },
    { name: "Nicaragua", timezone: "America/Managua" },
    { name: "Niger", timezone: "Africa/Niamey" },
    { name: "Nigeria", timezone: "Africa/Lagos" },
    { name: "North Korea", timezone: "Asia/Pyongyang" },
    { name: "North Macedonia", timezone: "Europe/Skopje" },
    { name: "Norway", timezone: "Europe/Oslo" },
    { name: "Oman", timezone: "Asia/Muscat" },
    { name: "Pakistan", timezone: "Asia/Karachi" },
    { name: "Panama", timezone: "America/Panama" },
    { name: "Papua New Guinea", timezone: "Pacific/Port_Moresby" },
    { name: "Paraguay", timezone: "America/Asuncion" },
    { name: "Peru", timezone: "America/Lima" },
    { name: "Philippines", timezone: "Asia/Manila" },
    { name: "Poland", timezone: "Europe/Warsaw" },
    { name: "Portugal", timezone: "Europe/Lisbon" },
    { name: "Qatar", timezone: "Asia/Qatar" },
    { name: "Romania", timezone: "Europe/Bucharest" },
    { name: "Russia (Moscow)", timezone: "Europe/Moscow" },
    { name: "Russia (Vladivostok)", timezone: "Asia/Vladivostok" },
    { name: "Russia (Yekaterinburg)", timezone: "Asia/Yekaterinburg" },
    { name: "Rwanda", timezone: "Africa/Kigali" },
    { name: "San Marino", timezone: "Europe/San_Marino" },
    { name: "Saudi Arabia", timezone: "Asia/Riyadh" },
    { name: "Senegal", timezone: "Africa/Dakar" },
    { name: "Serbia", timezone: "Europe/Belgrade" },
    { name: "Seychelles", timezone: "Indian/Mahe" },
    { name: "Sierra Leone", timezone: "Africa/Freetown" },
    { name: "Singapore", timezone: "Asia/Singapore" },
    { name: "Slovakia", timezone: "Europe/Bratislava" },
    { name: "Slovenia", timezone: "Europe/Ljubljana" },
    { name: "Solomon Islands", timezone: "Pacific/Guadalcanal" },
    { name: "Somalia", timezone: "Africa/Mogadishu" },
    { name: "South Africa", timezone: "Africa/Johannesburg" },
    { name: "South Korea", timezone: "Asia/Seoul" },
    { name: "South Sudan", timezone: "Africa/Juba" },
    { name: "Spain", timezone: "Europe/Madrid" },
    { name: "Sri Lanka", timezone: "Asia/Colombo" },
    { name: "Sudan", timezone: "Africa/Khartoum" },
    { name: "Suriname", timezone: "America/Paramaribo" },
    { name: "Sweden", timezone: "Europe/Stockholm" },
    { name: "Switzerland", timezone: "Europe/Zurich" },
    { name: "Syria", timezone: "Asia/Damascus" },
    { name: "Taiwan", timezone: "Asia/Taipei" },
    { name: "Tajikistan", timezone: "Asia/Dushanbe" },
    { name: "Tanzania", timezone: "Africa/Dar_es_Salaam" },
    { name: "Thailand", timezone: "Asia/Bangkok" },
    { name: "Togo", timezone: "Africa/Lome" },
    { name: "Tonga", timezone: "Pacific/Tongatapu" },
    { name: "Trinidad and Tobago", timezone: "America/Port_of_Spain" },
    { name: "Tunisia", timezone: "Africa/Tunis" },
    { name: "Turkey", timezone: "Europe/Istanbul" },
    { name: "Turkmenistan", timezone: "Asia/Ashgabat" },
    { name: "Uganda", timezone: "Africa/Kampala" },
    { name: "Ukraine", timezone: "Europe/Kiev" },
    { name: "United Arab Emirates", timezone: "Asia/Dubai" },
    { name: "United Kingdom", timezone: "Europe/London" },
    { name: "United States (New York)", timezone: "America/New_York" },
    { name: "United States (Los Angeles)", timezone: "America/Los_Angeles" },
    { name: "United States (Chicago)", timezone: "America/Chicago" },
    { name: "United States (Denver)", timezone: "America/Denver" },
    { name: "Uruguay", timezone: "America/Montevideo" },
    { name: "Uzbekistan", timezone: "Asia/Tashkent" },
    { name: "Vanuatu", timezone: "Pacific/Efate" },
    { name: "Vatican City", timezone: "Europe/Vatican" },
    { name: "Venezuela", timezone: "America/Caracas" },
    { name: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
    { name: "Yemen", timezone: "Asia/Aden" },
    { name: "Zambia", timezone: "Africa/Lusaka" },
    { name: "Zimbabwe", timezone: "Africa/Harare" }
];

let searchResults = [];

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
            <div class="label">${country.name}</div>
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
    
    searchInput.addEventListener('input', function() {
        searchCountries(this.value);
    });
    
    updateUTCTime();
    setInterval(() => {
        updateUTCTime();
        updateSearchResults();
    }, 1000);
});
