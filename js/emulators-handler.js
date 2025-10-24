class EmulatorsManager {
  constructor() {
    this.emulatorsData = [
      {
        name: 'CoffeeVM',
        version: 'v1.4.7',
        size: '3.56 MB',
        platform: 'mobile',
        icon: 'data/Pictures/coffeevm.webp',
        downloadUrl: 'data/EMU/Android/CoffeeVM.apk',
        description: 'Modern J2ME emulator for Android'
      },
      {
        name: 'J2ME Loader',
        version: 'v1.7.9',
        size: '8.28 MB',
        platform: 'mobile',
        icon: 'data/Pictures/j2meloader.png',
        downloadUrl: 'data/EMU/Android/J2MELoader.apk',
        description: 'Popular Android J2ME emulator'
      },
      {
        name: 'PhoneME',
        version: 'v1.0.0',
        size: '3.7 MB',
        platform: 'mobile',
        icon: 'data/Pictures/phoneme.png',
        downloadUrl: 'data/EMU/Android/PhoneME.apk',
        description: 'Open source J2ME implementation'
      },
      {
        name: 'JLMod',
        version: 'v0.86',
        size: '10.2 MB',
        platform: 'mobile',
        icon: 'data/Pictures/jlmod.png',
        downloadUrl: 'data/EMU/Android/JLMod.apk',
        description: 'Modified J2ME Loader with enhancements'
      },
      {
        name: 'NetMite',
        version: 'v2.0.3.7',
        size: '809 KB',
        platform: 'mobile',
        icon: 'data/Pictures/netmite.png',
        downloadUrl: 'data/EMU/Android/NetMite.apk',
        description: 'Lightweight J2ME emulator'
      },
      {
        name: 'Microemulator',
        version: 'v2.0.4',
        size: '629 KB',
        platform: 'desktop',
        icon: 'data/Pictures/microemulator.png',
        downloadUrl: 'data/EMU/Desktop/microemulator.jar',
        description: 'Cross-platform J2ME emulator'
      },
      {
        name: 'KEmulator',
        version: 'v0.9.8',
        size: '2.51 MB',
        platform: 'desktop',
        icon: 'data/Pictures/kemulator.png',
        downloadUrl: 'data/EMU/Desktop/KEmulatorLite.exe',
        description: 'Windows J2ME emulator'
      },
      {
        name: 'AngelChip',
        version: 'v1.0.0',
        size: '479 KB',
        platform: 'desktop',
        icon: 'data/Pictures/angelchip.png',
        downloadUrl: 'data/EMU/Desktop/AngelChipEmulator.jar',
        description: 'Java-based J2ME emulator'
      }
    ];
    
    this.filteredEmulators = [...this.emulatorsData];
    this.currentPlatform = 'all';
    this.searchTimeout = null;
    
    this.emulatorsList = document.getElementById('emulatorsList');
    this.searchInput = document.getElementById('searchInput');
    this.statsSection = document.getElementById('statsSection');
    this.platformFilters = document.getElementById('platformFilters');
    
    // Stats elements
    this.totalEmulatorsEl = document.getElementById('totalEmulators');
    this.desktopCountEl = document.getElementById('desktopCount');
    this.mobileCountEl = document.getElementById('mobileCount');
    this.visibleEmulatorsEl = document.getElementById('visibleEmulators');
    
    if (!this.emulatorsList || !this.searchInput) {
      console.error('Required DOM elements not found');
      return;
    }
    
    this.init();
  }
  
  init() {
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.setupPlatformFilters();
    this.renderTable();
    this.updateStats();
  }
  
  setupPlatformFilters() {
    const filterTabs = this.platformFilters.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        filterTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Update current platform and filter
        this.currentPlatform = tab.dataset.platform;
        this.applyFilters();
      });
    });
  }
  
  applyFilters() {
    let filtered = [...this.emulatorsData];
    
    // Apply platform filter
    if (this.currentPlatform !== 'all') {
      filtered = filtered.filter(emu => emu.platform === this.currentPlatform);
    }
    
    // Apply search filter
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(emu => 
        emu.name.toLowerCase().includes(searchTerm) ||
        emu.description.toLowerCase().includes(searchTerm)
      );
    }
    
    this.filteredEmulators = filtered;
    this.renderTable();
    this.updateStats();
  }
  
  renderTable() {
    if (this.filteredEmulators.length === 0) {
      this.showEmptyState();
      return;
    }
    
    const tableHTML = `
      <table class="file-table">
        <thead>
          <tr>
            <th>Emulator</th>
            <th>Version</th>
            <th>Size</th>
            <th>Platform</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredEmulators.map(emu => `
            <tr>
              <td>
                <div class="emulator-name-cell">
                  <img src="${emu.icon}" alt="${emu.name}" class="emulator-icon">
                  <div class="emulator-details">
                    <div class="emulator-name">${this.escapeHtml(emu.name)}</div>
                    <div class="emulator-version">${this.escapeHtml(emu.description)}</div>
                  </div>
                </div>
              </td>
              <td class="file-size">${this.escapeHtml(emu.version)}</td>
              <td class="file-size">${this.escapeHtml(emu.size)}</td>
              <td>
                <span class="platform-badge ${emu.platform}">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="${this.getPlatformIcon(emu.platform)}"/>
                  </svg>
                  ${emu.platform === 'desktop' ? 'Desktop' : 'Mobile'}
                </span>
              </td>
              <td class="file-actions">
                <button class="btn-download" data-url="${emu.downloadUrl}" data-name="${this.escapeHtml(emu.name)}">
                  <svg class="download-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                  </svg>
                  <svg class="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="1s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="1s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  Download
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    this.emulatorsList.innerHTML = tableHTML;
    this.attachDownloadHandlers();
  }
  
  showEmptyState() {
    const isFiltered = this.currentPlatform !== 'all' || this.searchInput.value.trim();
    const message = isFiltered ? 'No emulators match your criteria' : 'No emulators available';
    const icon = 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z';
    
    this.emulatorsList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="${icon}"/>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }
  
  attachDownloadHandlers() {
    const downloadBtns = this.emulatorsList.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDownload(e));
    });
  }
  
  handleDownload(event) {
    const button = event.currentTarget;
    const url = button.dataset.url;
    const filename = button.dataset.name;
    
    if (!url || !filename) return;
    
    button.disabled = true;
    button.classList.add('loading');
    
    // Simulate brief loading for UX
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      button.disabled = false;
      button.classList.remove('loading');
    }, 500);
  }
  
  handleSearch(searchTerm) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }
  
  updateStats() {
    const desktopCount = this.emulatorsData.filter(emu => emu.platform === 'desktop').length;
    const mobileCount = this.emulatorsData.filter(emu => emu.platform === 'mobile').length;
    
    this.totalEmulatorsEl.textContent = this.emulatorsData.length;
    this.desktopCountEl.textContent = desktopCount;
    this.mobileCountEl.textContent = mobileCount;
    this.visibleEmulatorsEl.textContent = this.filteredEmulators.length;
    
    this.statsSection.style.display = 'flex';
  }
  
  getPlatformIcon(platform) {
    return platform === 'desktop' 
      ? 'M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z'
      : 'M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EmulatorsManager();
});