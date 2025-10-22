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
      if (typeof RetroNavbar !== 'undefined' && typeof NavbarAuth !== 'undefined') {
        new RetroNavbar();
        new NavbarAuth();
      }
    });
  }
  
  static async loadFooter() {
    return this.loadComponent('#footer', 'components/footer.html');
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
