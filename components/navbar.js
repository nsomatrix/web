class RetroNavbar {
  constructor() {
    this.init();
  }

  init() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
      });

      // Close menu when clicking on a link
      menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          toggle.classList.remove('active');
          menu.classList.remove('active');
        }
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
          toggle.classList.remove('active');
          menu.classList.remove('active');
        }
      });
    }
  }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RetroNavbar();
});