// Global Loader Functions
window.showLoader = function() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.remove('hidden');
  }
};

window.hideLoader = function() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
};

// Auto-hide loader when page is fully loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    window.hideLoader();
  }, 500);
});