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

      // Handle dropdown toggles
      const dropdowns = document.querySelectorAll('.dropdown-toggle');
      dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
          e.preventDefault();
          const parent = dropdown.parentElement;
          parent.classList.toggle('active');
          
          // Close other dropdowns
          dropdowns.forEach(other => {
            if (other !== dropdown) {
              other.parentElement.classList.remove('active');
            }
          });
        });
      });

      // Close menu when clicking on a non-dropdown link
      menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && !e.target.classList.contains('dropdown-toggle')) {
          toggle.classList.remove('active');
          menu.classList.remove('active');
          // Close all dropdowns
          document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
          });
        }
      });

      // Close menu and dropdowns when clicking outside
      document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
          toggle.classList.remove('active');
          menu.classList.remove('active');
          document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
          });
        }
      });
    }
  }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RetroNavbar();
});