const API_CONFIG = {
  itemId: 'nsomtx-active-mods',
  baseUrl: 'https://archive.org/download/'
};

class ModsManager {
  constructor() {
    this.modsData = [];
    this.filteredMods = [];
    this.searchTimeout = null;
    
    this.fileList = document.getElementById('fileList');
    this.searchInput = document.getElementById('searchInput');
    this.statsSection = document.getElementById('statsSection');
    this.totalModsEl = document.getElementById('totalMods');
    this.visibleModsEl = document.getElementById('visibleMods');
    
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
      
      // Filter and process .jar files
      const jarFiles = data.files
        .filter(file => file.name.endsWith('.jar'))
        .slice(0, 100)
        .map(file => ({
          name: file.name,
          size: file.size || 0,
          downloadUrl: `${API_CONFIG.baseUrl}${API_CONFIG.itemId}/${file.name}`
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      this.modsData = jarFiles;
      this.filteredMods = [...jarFiles];
      this.renderTable();
      this.updateStats();
      
    } catch (error) {
      console.error('Error fetching MODs:', error);
      this.showError('Failed to load MODs. Please try again later.');
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
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredMods.map(mod => `
            <tr>
              <td class="file-name">${this.escapeHtml(mod.name)}</td>
              <td class="file-size">${this.formatFileSize(mod.size)}</td>
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
    const message = isEmpty ? 'No MODs available' : 'No MODs match your search';
    const icon = isEmpty ? 'M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C3.89,3 3,3.89 3,3M19,5V19H5V5H19Z' : 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z';
    
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
      this.totalModsEl.textContent = this.modsData.length;
      this.visibleModsEl.textContent = this.filteredMods.length;
      this.statsSection.style.display = 'flex';
    }
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
  new ModsManager();
});