class RetroNavbar {
  constructor() {
    this.init();
  }

  init() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    
    if (toggle && menu) {
      // Handle both click and touch events for mobile
      const toggleMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
      };
      
      toggle.addEventListener('click', toggleMenu);
      toggle.addEventListener('touchend', toggleMenu);

      // Handle dropdown toggles
      const dropdowns = document.querySelectorAll('.dropdown-toggle');
      dropdowns.forEach(dropdown => {
        let touchStarted = false;
        
        const handleDropdown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const parent = dropdown.parentElement;
          parent.classList.toggle('active');
          
          // Close other dropdowns
          dropdowns.forEach(other => {
            if (other !== dropdown) {
              other.parentElement.classList.remove('active');
            }
          });
        };
        
        // Handle touch events properly
        dropdown.addEventListener('touchstart', (e) => {
          touchStarted = true;
        });
        
        dropdown.addEventListener('touchend', (e) => {
          if (touchStarted) {
            handleDropdown(e);
            touchStarted = false;
          }
        });
        
        dropdown.addEventListener('click', (e) => {
          if (!touchStarted) {
            handleDropdown(e);
          }
        });
      });

      // Close menu when clicking on a non-dropdown link
      const closeMenu = (e) => {
        if (e.target.tagName === 'A' && !e.target.classList.contains('dropdown-toggle')) {
          toggle.classList.remove('active');
          menu.classList.remove('active');
          // Close all dropdowns
          document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
          });
        }
      };
      
      menu.addEventListener('click', closeMenu);
      menu.addEventListener('touchend', (e) => {
        // Small delay to ensure touch events are processed correctly
        setTimeout(() => closeMenu(e), 10);
      });

      // Close menu and dropdowns when clicking outside
      const closeOnOutsideClick = (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
          toggle.classList.remove('active');
          menu.classList.remove('active');
          document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
          });
        }
      };
      
      document.addEventListener('click', closeOnOutsideClick);
      document.addEventListener('touchend', closeOnOutsideClick);
      
      // Close menu on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
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

// Firebase auth state management
class NavbarAuth {
  constructor() {
    this.authLink = document.getElementById('authLink');
    this.mobileAuthLink = document.getElementById('mobileAuthLink');
    this.initFirebaseAuth();
  }

  initFirebaseAuth() {
    // Check localStorage first for login state
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    this.updateAuthLinks(isLoggedIn ? { uid: 'user' } : null);
    
    // Setup Firebase listener with multiple attempts
    this.setupFirebaseListener();
  }

  setupFirebaseListener() {
    let attempts = 0;
    const maxAttempts = 50;
    
    const trySetupListener = () => {
      attempts++;
      
      // Try different Firebase auth instances
      let auth = null;
      if (window.firebase && window.firebase.auth) {
        auth = window.firebase.auth();
      } else if (window.firebaseAuth) {
        auth = window.firebaseAuth;
      }
      
      if (auth) {
        console.log('Firebase auth found, setting up listener');
        auth.onAuthStateChanged((user) => {
          console.log('Auth state changed:', user ? 'logged in' : 'logged out');
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
      } else {
        console.warn('Firebase auth not found after maximum attempts');
      }
    };
    
    trySetupListener();
  }

  updateAuthLinks(user) {
    const loginSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17v-3H3v-4h7V7l5 5-5 5M10 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2h2v2h9V4h-9v2H8V4a2 2 0 0 1 2-2z"/></svg>';
    const logoutSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41M19 3a2 2 0 0 1 2 2v4.67l-2-2V5H5v14h14v-2.67l2-2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14z"/></svg>';
    
    if (user) {
      // User is logged in - show LOGOUT
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
      // User is not logged in - show LOGIN
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
      console.log('Logout initiated');
      
      // Find and use the appropriate Firebase auth instance
      let auth = null;
      if (window.firebase && window.firebase.auth) {
        auth = window.firebase.auth();
      } else if (window.firebaseAuth) {
        auth = window.firebaseAuth;
      }
      
      if (auth) {
        await auth.signOut();
        console.log('Firebase signOut completed');
      }
      
      // Clear all session data
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      
      // Redirect to home page
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if Firebase logout fails, clear local data and redirect
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  }
}

// Initialize navbar when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new RetroNavbar();
    new NavbarAuth();
  });
} else {
  // DOM is already loaded
  new RetroNavbar();
  new NavbarAuth();
}