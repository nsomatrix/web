const API_CONFIG = {
  itemId: 'nso-archived-mods',
  baseUrl: 'https://archive.org/download/'
};

class DeprecatedManager {
  constructor() {
    this.modsData = [];
    this.filteredMods = [];
    this.searchTimeout = null;
    
    // Rate limiting configuration
    this.rateLimitKey = 'mod_downloads_history';
    this.maxDownloadsPerHour = 10;
    this.rateLimitWindow = 3600000; // 1 hour in milliseconds
    
    this.fileList = document.getElementById('fileList');
    this.searchInput = document.getElementById('searchInput');
    this.statsSection = document.getElementById('statsSection');
    this.totalModsEl = document.getElementById('totalMods');
    this.jarCountEl = document.getElementById('jarCount');
    this.zipCountEl = document.getElementById('zipCount');
    
    if (!this.fileList || !this.searchInput) {
      console.error('Required DOM elements not found');
      return;
    }
    
    this.init();
  }
  
  init() {
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.fetchMods();
  }
  
  async fetchMods() {
    try {
      const apiUrl = `https://archive.org/metadata/${API_CONFIG.itemId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.files) {
        throw new Error('No files found in archive');
      }
      
      // Filter and process .jar and .zip files
      const modFiles = data.files
        .filter(file => file.name.endsWith('.jar') || file.name.endsWith('.zip'))
        .slice(0, 100)
        .map(file => ({
          name: file.name,
          size: file.size || 0,
          downloadUrl: `${API_CONFIG.baseUrl}${API_CONFIG.itemId}/${file.name}`,
          type: file.name.endsWith('.jar') ? 'jar' : 'zip',
          isDeprecated: true
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      this.modsData = modFiles;
      this.filteredMods = [...modFiles];
      this.renderTable();
      this.updateStats();
      
    } catch (error) {
      console.error('Error fetching deprecated MODs:', error);
      this.showError('Failed to load deprecated MODs. Please try again later.');
    }
  }
  
  renderTable() {
    if (this.filteredMods.length === 0) {
      this.showEmptyState();
      return;
    }
    
    const tableHTML = `
      <table class="file-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredMods.map(mod => `
            <tr>
              <td class="file-name">${this.escapeHtml(mod.name)}</td>
              <td class="file-size">${this.formatFileSize(mod.size)}</td>
              <td>
                <span class="deprecated-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,3H21V7H3V3M4,8H20V21H4V8M9.5,11A0.5,0.5 0 0,0 9,11.5V13H15V11.5A0.5,0.5 0 0,0 14.5,11H9.5Z"/>
                  </svg>
                  Deprecated
                </span>
              </td>
              <td class="file-actions">
                <button class="btn-download" data-url="${mod.downloadUrl}" data-name="${this.escapeHtml(mod.name)}">
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
    
    this.fileList.innerHTML = tableHTML;
    this.attachDownloadHandlers();
  }
  
  showEmptyState() {
    const isEmpty = this.modsData.length === 0;
    const message = isEmpty ? 'No deprecated MODs available' : 'No deprecated MODs match your search';
    const icon = isEmpty ? 'M3,3H21V7H3V3M4,8H20V21H4V8M9.5,11A0.5,0.5 0 0,0 9,11.5V13H15V11.5A0.5,0.5 0 0,0 14.5,11H9.5Z' : 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z';
    
    this.fileList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="${icon}"/>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }
  
  showError(message) {
    this.fileList.innerHTML = `<div class="loading-message">${message}</div>`;
  }
  
  attachDownloadHandlers() {
    const downloadBtns = this.fileList.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDownload(e));
    });
  }
  
  handleDownload(event) {
    const button = event.currentTarget;
    const url = button.dataset.url;
    const filename = button.dataset.name;
    
    if (!url || !filename) return;
    
    // Check rate limit before proceeding
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      this.showRateLimitMessage(rateLimitCheck.remainingTime);
      return;
    }
    
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
      
      // Record this download
      this.recordDownload();
      
      button.disabled = false;
      button.classList.remove('loading');
      
      // Show remaining downloads
      this.showDownloadSuccess();
    }, 500);
  }

  checkRateLimit() {
    const stored = localStorage.getItem(this.rateLimitKey);
    const downloads = stored ? JSON.parse(stored) : [];
    const now = Date.now();

    // Filter out downloads older than the time window
    const recentDownloads = downloads.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    if (recentDownloads.length >= this.maxDownloadsPerHour) {
      // Calculate time until oldest download expires
      const oldestDownload = Math.min(...recentDownloads);
      const timeUntilReset = this.rateLimitWindow - (now - oldestDownload);

      return {
        allowed: false,
        remainingTime: timeUntilReset,
        downloadsUsed: recentDownloads.length
      };
    }

    return {
      allowed: true,
      downloadsRemaining: this.maxDownloadsPerHour - recentDownloads.length,
      downloadsUsed: recentDownloads.length
    };
  }

  recordDownload() {
    const stored = localStorage.getItem(this.rateLimitKey);
    const downloads = stored ? JSON.parse(stored) : [];
    const now = Date.now();

    // Add current download timestamp
    downloads.push(now);

    // Clean old entries while we're at it
    const recentDownloads = downloads.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    localStorage.setItem(this.rateLimitKey, JSON.stringify(recentDownloads));
  }

  showRateLimitMessage(remainingTime) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'rate-limit-overlay';
    
    const rateLimitCheck = this.checkRateLimit();
    
    overlay.innerHTML = `
      <div class="rate-limit-modal">
        <button class="rate-limit-close" onclick="this.closest('.rate-limit-overlay').remove()">×</button>
        
        <div class="rate-limit-modal-header">
          <div class="rate-limit-modal-title">
            <h2>Download Limit Reached</h2>
            <p>Please wait before downloading again</p>
          </div>
        </div>
        
        <div class="rate-limit-modal-body">
          <div class="rate-limit-message">
            You've reached the maximum of <strong>${this.maxDownloadsPerHour} downloads per hour</strong>. 
            This limit helps ensure fair access for all users.
          </div>
          
          <div class="rate-limit-countdown">
            <span class="countdown-label">Reset in:</span>
            <span class="countdown-time" id="countdownTimer">--:--:--</span>
          </div>
          
          <div class="rate-limit-stats">
            <div class="rate-limit-stat">
              <span class="rate-limit-stat-value">${rateLimitCheck.downloadsUsed}</span>
              <span class="rate-limit-stat-label">Downloads Used</span>
            </div>
            <div class="rate-limit-stat">
              <span class="rate-limit-stat-value">${this.maxDownloadsPerHour}</span>
              <span class="rate-limit-stat-label">Hourly Limit</span>
            </div>
          </div>
        </div>
        
        <div class="rate-limit-modal-footer">
          <button class="rate-limit-btn rate-limit-btn-primary" onclick="this.closest('.rate-limit-overlay').remove()">
            Got It
          </button>
          <button class="rate-limit-btn rate-limit-btn-secondary" onclick="window.location.reload()">
            Refresh Page
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Start countdown timer
    this.startCountdown(remainingTime, overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  startCountdown(remainingTime, overlay) {
    const timerElement = overlay.querySelector('#countdownTimer');
    const endTime = Date.now() + remainingTime;
    
    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        timerElement.textContent = '00:00:00';
        clearInterval(countdownInterval);
        
        // Update modal to show it's ready
        const modal = overlay.querySelector('.rate-limit-modal');
        modal.classList.add('ready');
        overlay.querySelector('.rate-limit-modal-title h2').textContent = 'Ready to Download!';
        overlay.querySelector('.rate-limit-modal-title p').textContent = 'You can now download files again';
        overlay.querySelector('.rate-limit-message').innerHTML = 'Your download limit has been reset. Click below to continue.';
        return;
      }
      
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      timerElement.textContent = formattedTime;
    };
    
    updateTimer();
    const countdownInterval = setInterval(updateTimer, 1000);
    
    // Store interval ID to clear it when modal is closed
    overlay.dataset.intervalId = countdownInterval;
    
    // Clear interval when modal is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === overlay) {
            clearInterval(countdownInterval);
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true });
  }

  showDownloadSuccess() {
    const rateLimitCheck = this.checkRateLimit();
    if (rateLimitCheck.allowed && rateLimitCheck.downloadsRemaining <= 3) {
      console.log(`Downloads remaining: ${rateLimitCheck.downloadsRemaining}/${this.maxDownloadsPerHour}`);
    }
  }
  
  handleSearch(searchTerm) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      const term = searchTerm.toLowerCase().trim();
      
      if (!term) {
        this.filteredMods = [...this.modsData];
      } else {
        this.filteredMods = this.modsData.filter(mod => 
          mod.name.toLowerCase().includes(term)
        );
      }
      
      this.renderTable();
      this.updateStats();
    }, 300);
  }
  
  updateStats() {
    if (this.modsData.length > 0) {
      const jarCount = this.filteredMods.filter(mod => mod.type === 'jar').length;
      const zipCount = this.filteredMods.filter(mod => mod.type === 'zip').length;

      // Animate counters
      this.animateCounter(this.totalModsEl, this.modsData.length);
      this.animateCounter(this.jarCountEl, jarCount);
      this.animateCounter(this.zipCountEl, zipCount);
      
      this.statsSection.style.display = 'flex';
    }
  }

  animateCounter(element, targetValue) {
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
  
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    
    return `${size} ${sizes[i]}`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DeprecatedManager();
});