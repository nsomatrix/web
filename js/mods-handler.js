const SPINNER_DURATION = 1000;
const API_CONFIG = {
  itemId: 'nsomtx-active-mods',
  baseUrl: 'https://archive.org/download/'
};

document.addEventListener('DOMContentLoaded', function() {
  const fileList = document.getElementById('fileList');
  const searchInput = document.getElementById('searchInput');
  
  if (!fileList || !searchInput) {
    console.error('Required DOM elements not found');
    return;
  }

  let modsData = [];

  // Fetch MODs from Internet Archive API
  async function fetchMods() {
    try {
      const apiUrl = `https://archive.org/metadata/${API_CONFIG.itemId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract files from Internet Archive metadata
      if (!data.files) {
        throw new Error('No files found in archive');
      }
      
      // Filter for .jar files only
      const jarFiles = data.files.filter(file => file.name.endsWith('.jar'));
      const maxItems = Math.min(jarFiles.length, 100);
      
      // Transform to match expected format
      modsData = jarFiles.slice(0, maxItems).map(file => ({
        name: file.name,
        download_url: `${API_CONFIG.baseUrl}${API_CONFIG.itemId}/${file.name}`
      }));
      
      renderMods(modsData);
      
    } catch (error) {
      console.error('Error fetching MODs:', error);
      showError('Error loading MODs. Please try again later.');
    }
  }

  // Render MODs grid
  function renderMods(mods) {
    fileList.classList.remove('loading');
    fileList.innerHTML = '';

    if (mods.length === 0) {
      fileList.innerHTML = '<div class="loading-message">No MODs found</div>';
      return;
    }

    mods.forEach(mod => {
      const modItem = document.createElement('div');
      modItem.className = 'mod-item';
      
      modItem.innerHTML = `
        <div class="mod-name">${mod.name}</div>
        <button class="download-button" data-url="${mod.download_url}" data-name="${mod.name}">
          <span class="btn-text">Download</span>
          <svg class="loader" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        </button>
      `;

      const downloadBtn = modItem.querySelector('.download-button');
      downloadBtn.addEventListener('click', handleDownload);

      fileList.appendChild(modItem);
    });
  }

  // Handle download with loading state
  function handleDownload(event) {
    const button = event.currentTarget;
    const url = button.dataset.url;
    const filename = button.dataset.name;
    
    if (!url || !filename) return;

    button.disabled = true;
    button.classList.add('loading');

    setTimeout(() => {
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reset button state
      button.disabled = false;
      button.classList.remove('loading');
    }, SPINNER_DURATION);
  }

  // Show error message
  function showError(message) {
    fileList.classList.remove('loading');
    fileList.innerHTML = `<div class="loading-message">${message}</div>`;
  }

  // Debounced search functionality
  let searchTimeout;
  function debounceSearch(callback, delay) {
    return function(...args) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => callback.apply(this, args), delay);
    };
  }

  const debouncedSearch = debounceSearch(function(searchTerm) {
    const items = document.querySelectorAll('.mod-item');
    
    items.forEach(item => {
      const modName = item.querySelector('.mod-name');
      if (modName) {
        const name = modName.textContent.toLowerCase();
        const isVisible = name.includes(searchTerm.toLowerCase());
        item.classList.toggle('hidden', !isVisible);
      }
    });
  }, 300);

  // Search input handler
  searchInput.addEventListener('input', function() {
    debouncedSearch(this.value);
  });

  // Initialize
  fetchMods();
});