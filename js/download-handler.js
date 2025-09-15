document.addEventListener('DOMContentLoaded', function() {
  const downloadButtons = document.querySelectorAll('.btn-download');
  
  downloadButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const href = this.dataset.href;
      if (!href) return;
      
      // Disable button and show loader
      this.disabled = true;
      this.classList.add('loading');
      
      // Simulate download delay
      setTimeout(() => {
        // Create and trigger download
        const link = document.createElement('a');
        link.href = href;
        link.download = '';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset button state
        this.disabled = false;
        this.classList.remove('loading');
      }, 1000);
    });
  });
});