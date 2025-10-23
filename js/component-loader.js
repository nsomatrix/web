// Industry-standard component loader
class ComponentLoader {
  static async loadComponent(selector, componentPath, initCallback) {
    try {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Element ${selector} not found`);
      
      const response = await fetch(componentPath);
      if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
      
      const html = await response.text();
      element.innerHTML = html;
      
      if (initCallback) {
        await initCallback();
      }
      
      return true;
    } catch (error) {
      console.error('Component loading failed:', error);
      return false;
    }
  }
  
  static async loadNavbar() {
    return this.loadComponent('#navbar', 'components/navbar.html', () => {
      this.initializeNavbar();
    });
  }
  
  static async loadFooter() {
    return this.loadComponent('#footer', 'components/footer.html', () => {
      this.initializeSupport();
    });
  }
  
  static initializeNavbar() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    
    if (!toggle || !menu) {
      setTimeout(() => this.initializeNavbar(), 200);
      return;
    }
    
    toggle.replaceWith(toggle.cloneNode(true));
    const newToggle = document.getElementById('navToggle');
    
    const toggleMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      newToggle.classList.toggle('active');
      menu.classList.toggle('active');
    };
    
    newToggle.addEventListener('click', toggleMenu, { passive: false });
    newToggle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      toggleMenu(e);
    }, { passive: false });

    setTimeout(() => {
      const dropdowns = document.querySelectorAll('.dropdown-toggle');
      dropdowns.forEach(dropdown => dropdown.replaceWith(dropdown.cloneNode(true)));
      
      const newDropdowns = document.querySelectorAll('.dropdown-toggle');
      newDropdowns.forEach(dropdown => {
        const handleDropdown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const parent = dropdown.parentElement;
          parent.classList.toggle('active');
          
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

    const closeMenu = () => {
      newToggle.classList.remove('active');
      menu.classList.remove('active');
      document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    };
    
    menu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && !e.target.classList.contains('dropdown-toggle')) {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!newToggle.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });
    
    this.initializeNavbarAuth();
  }
  
  static initializeNavbarAuth() {
    const authLink = document.getElementById('authLink');
    const mobileAuthLink = document.getElementById('mobileAuthLink');
    
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    this.updateAuthLinks(isLoggedIn ? { uid: 'user' } : null, authLink, mobileAuthLink);
    this.setupFirebaseListener(authLink, mobileAuthLink);
  }

  static setupFirebaseListener(authLink, mobileAuthLink) {
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
          this.updateAuthLinks(user, authLink, mobileAuthLink);
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

  static updateAuthLinks(user, authLink, mobileAuthLink) {
    const loginSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17v-3H3v-4h7V7l5 5-5 5M10 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2h2v2h9V4h-9v2H8V4a2 2 0 0 1 2-2z"/></svg>';
    const logoutSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41M19 3a2 2 0 0 1 2 2v4.67l-2-2V5H5v14h14v-2.67l2-2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14z"/></svg>';
    
    if (user) {
      if (authLink) {
        authLink.innerHTML = logoutSvg + ' LOGOUT';
        authLink.href = '#';
        authLink.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      }
      if (mobileAuthLink) {
        mobileAuthLink.innerHTML = logoutSvg + ' LOGOUT';
        mobileAuthLink.href = '#';
        mobileAuthLink.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      }
    } else {
      if (authLink) {
        authLink.innerHTML = loginSvg + ' LOGIN';
        authLink.href = 'login.html';
        authLink.onclick = null;
      }
      if (mobileAuthLink) {
        mobileAuthLink.innerHTML = loginSvg + ' LOGIN';
        mobileAuthLink.href = 'login.html';
        mobileAuthLink.onclick = null;
      }
    }
  }

  static async logout() {
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
  
  static initializeSupport() {
    const supportBtn = document.getElementById('supportBtn');
    if (!supportBtn) return;
    
    this.initCustomSelect();
    
    supportBtn.onclick = () => {
      document.getElementById('supportModal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    };
    
    window.submitSupport = () => {
      const form = document.getElementById('supportForm');
      const name = document.getElementById('userName').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      const category = document.getElementById('category').value;
      const message = document.getElementById('message').value.trim();
      const btn = document.getElementById('submitBtn');
      
      if (!name || !email || !category || !message) {
        this.showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      btn.disabled = true;
      
      const ticketId = 'MTX-' + Date.now().toString(36).toUpperCase();
      
      fetch('https://support-proxy.nsomtx.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message, ticketId })
      }).then(r => {
        if (r.ok) {
          this.showSuccessModal(ticketId);
          form.reset();
        } else throw new Error();
      }).catch(() => {
        this.showNotification('Failed to send message. Please try again.', 'error');
      }).finally(() => {
        btn.innerHTML = 'Send Message';
        btn.disabled = false;
      });
    };
    
    document.querySelectorAll('.close, .btn-secondary').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('supportModal').style.display = 'none';
        document.body.style.overflow = 'auto';
      };
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('supportModal').style.display === 'block') {
        document.getElementById('supportModal').style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });
  }
  
  static initCustomSelect() {
    const select = document.getElementById('category');
    if (!select) return;
    
    const selectContainer = select.parentNode;
    const selectSelected = document.createElement('div');
    selectSelected.className = 'select-selected';
    selectSelected.innerHTML = 'Select a category';
    selectContainer.appendChild(selectSelected);
    
    const selectItems = document.createElement('div');
    selectItems.className = 'select-items select-hide';
    
    for (let i = 1; i < select.length; i++) {
      const option = document.createElement('div');
      option.innerHTML = select.options[i].innerHTML;
      option.addEventListener('click', function() {
        select.selectedIndex = i;
        selectSelected.innerHTML = this.innerHTML;
        selectSelected.click();
      });
      selectItems.appendChild(option);
    }
    selectContainer.appendChild(selectItems);
    
    selectSelected.addEventListener('click', function(e) {
      e.stopPropagation();
      ComponentLoader.closeAllSelect(this);
      this.nextSibling.classList.toggle('select-hide');
      this.classList.toggle('select-arrow-active');
    });
    
    document.addEventListener('click', ComponentLoader.closeAllSelect);
  }
  
  static closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName('select-items');
    const selectSelected = document.getElementsByClassName('select-selected');
    
    for (let i = 0; i < selectSelected.length; i++) {
      if (elmnt != selectSelected[i]) {
        selectSelected[i].classList.remove('select-arrow-active');
      }
    }
    
    for (let i = 0; i < selectItems.length; i++) {
      if (elmnt != selectSelected[i]) {
        selectItems[i].classList.add('select-hide');
      }
    }
  }
  
  static showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
  
  static showSuccessModal(ticketId) {
    document.getElementById('supportModal').style.display = 'none';
    const successModal = document.createElement('div');
    successModal.className = 'support-modal';
    successModal.style.display = 'block';
    successModal.innerHTML = `
      <div class="modal-content success-modal">
        <div class="success-icon"><i class="fas fa-check-circle"></i></div>
        <h3>Message Sent Successfully!</h3>
        <p>Thank you for contacting us. Your ticket ID is:</p>
        <div class="ticket-id">${ticketId}</div>
        <p>We'll respond to your email within 24 hours.</p>
        <button class="btn-primary" onclick="this.parentElement.parentElement.remove();document.body.style.overflow='auto'">Close</button>
      </div>
    `;
    document.body.appendChild(successModal);
  }
  
  static async loadAll() {
    await Promise.all([
      this.loadNavbar(),
      this.loadFooter()
    ]);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ComponentLoader.loadAll());
} else {
  ComponentLoader.loadAll();
}
