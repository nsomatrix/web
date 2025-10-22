class RetroNavbar {
  constructor() {
    setTimeout(() => this.init(), 100);
  }

  init() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    
    if (!toggle || !menu) {
      setTimeout(() => this.init(), 200);
      return;
    }
    
    // Remove any existing listeners
    toggle.replaceWith(toggle.cloneNode(true));
    const newToggle = document.getElementById('navToggle');
    
    // Handle mobile menu toggle
    const toggleMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      newToggle.classList.toggle('active');
      menu.classList.toggle('active');
    };
    
    // Add multiple event listeners for better mobile support
    newToggle.addEventListener('click', toggleMenu, { passive: false });
    newToggle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      toggleMenu(e);
    }, { passive: false });

    // Handle dropdown toggles - wait for DOM to be ready
    setTimeout(() => {
      const dropdowns = document.querySelectorAll('.dropdown-toggle');
      
      dropdowns.forEach(dropdown => {
        // Remove existing listeners
        dropdown.replaceWith(dropdown.cloneNode(true));
      });
      
      // Re-query after replacing elements
      const newDropdowns = document.querySelectorAll('.dropdown-toggle');
      newDropdowns.forEach(dropdown => {
        const handleDropdown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const parent = dropdown.parentElement;
          parent.classList.toggle('active');
          
          // Close other dropdowns
          newDropdowns.forEach(other => {
            if (other !== dropdown) {
              other.parentElement.classList.remove('active');
            }
          });
        };
        
        dropdown.addEventListener('click', handleDropdown, { passive: false });
        dropdown.addEventListener('touchstart', handleDropdown, { passive: false });
      });
    }, 100);

    // Close menu when clicking on links
    const closeMenu = () => {
      newToggle.classList.remove('active');
      menu.classList.remove('active');
      document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    };
    
    // Close menu on link clicks
    menu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && !e.target.classList.contains('dropdown-toggle')) {
        closeMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!newToggle.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });
  }
}

class NavbarAuth {
  constructor() {
    this.authLink = document.getElementById('authLink');
    this.mobileAuthLink = document.getElementById('mobileAuthLink');
    this.initFirebaseAuth();
  }

  initFirebaseAuth() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    this.updateAuthLinks(isLoggedIn ? { uid: 'user' } : null);
    this.setupFirebaseListener();
  }

  setupFirebaseListener() {
    let attempts = 0;
    const maxAttempts = 50;
    
    const trySetupListener = () => {
      attempts++;
      
      let auth = null;
      if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
        auth = window.firebase.auth();
      } else if (window.firebaseAuth) {
        auth = window.firebaseAuth;
      }
      
      if (auth) {
        auth.onAuthStateChanged((user) => {
          this.updateAuthLinks(user);
          if (user) {
            localStorage.setItem('userLoggedIn', 'true');
          } else {
            localStorage.removeItem('userLoggedIn');
          }
        });
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(trySetupListener, 200);
      }
    };
    
    trySetupListener();
  }

  updateAuthLinks(user) {
    const loginSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17v-3H3v-4h7V7l5 5-5 5M10 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2h2v2h9V4h-9v2H8V4a2 2 0 0 1 2-2z"/></svg>';
    const logoutSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41M19 3a2 2 0 0 1 2 2v4.67l-2-2V5H5v14h14v-2.67l2-2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14z"/></svg>';
    
    if (user) {
      if (this.authLink) {
        this.authLink.innerHTML = logoutSvg + ' LOGOUT';
        this.authLink.href = '#';
        this.authLink.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      }
      if (this.mobileAuthLink) {
        this.mobileAuthLink.innerHTML = logoutSvg + ' LOGOUT';
        this.mobileAuthLink.href = '#';
        this.mobileAuthLink.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      }
    } else {
      if (this.authLink) {
        this.authLink.innerHTML = loginSvg + ' LOGIN';
        this.authLink.href = 'login.html';
        this.authLink.onclick = null;
      }
      if (this.mobileAuthLink) {
        this.mobileAuthLink.innerHTML = loginSvg + ' LOGIN';
        this.mobileAuthLink.href = 'login.html';
        this.mobileAuthLink.onclick = null;
      }
    }
  }

  async logout() {
    try {
      let auth = null;
      if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
        auth = window.firebase.auth();
      } else if (window.firebaseAuth) {
        auth = window.firebaseAuth;
      }
      
      if (auth) {
        await auth.signOut();
      }
      
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      window.location.href = 'index.html';
    } catch (error) {
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  }
}

function initializeNavbar() {
  const checkNavbar = () => {
    const toggle = document.getElementById('navToggle');
    if (toggle) {
      new RetroNavbar();
      new NavbarAuth();
    } else {
      setTimeout(checkNavbar, 100);
    }
  };
  checkNavbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavbar);
} else {
  initializeNavbar();
}
