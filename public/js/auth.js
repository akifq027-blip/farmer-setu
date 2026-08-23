/**
 * KisanSetu - Authentication & Session State Management
 */

const Auth = {
  getCurrentFarmer() {
    try {
      const data = localStorage.getItem('kisansetu_farmer');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  getCurrentAdmin() {
    try {
      const data = localStorage.getItem('kisansetu_admin');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setFarmerSession(farmer, token) {
    localStorage.setItem('kisansetu_farmer', JSON.stringify(farmer));
    if (token) localStorage.setItem('kisansetu_token', token);
    this.updateNav();
  },

  setAdminSession(admin, token) {
    localStorage.setItem('kisansetu_admin', JSON.stringify(admin));
    if (token) localStorage.setItem('kisansetu_admin_token', token);
  },

  logoutFarmer() {
    localStorage.removeItem('kisansetu_farmer');
    localStorage.removeItem('kisansetu_token');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 500);
  },

  logoutAdmin() {
    localStorage.removeItem('kisansetu_admin');
    localStorage.removeItem('kisansetu_admin_token');
    showToast('Admin session closed', 'info');
    setTimeout(() => {
      window.location.href = '/admin/login.html';
    }, 500);
  },

  requireFarmerAuth() {
    const farmer = this.getCurrentFarmer();
    if (!farmer) {
      // Save redirect destination
      localStorage.setItem('kisansetu_redirect', window.location.pathname);
      window.location.href = '/login.html';
      return null;
    }
    return farmer;
  },

  requireAdminAuth() {
    const admin = this.getCurrentAdmin();
    if (!admin) {
      window.location.href = '/admin/login.html';
      return null;
    }
    return admin;
  },

  updateNav() {
    const farmer = this.getCurrentFarmer();
    const navAuth = document.getElementById('nav-auth-container');
    if (!navAuth) return;

    if (farmer) {
      navAuth.innerHTML = `
        <a href="/dashboard.html" class="btn btn-outline-primary btn-sm">
          🌾 <span>${farmer.full_name.split(' ')[0]}</span>
        </a>
        <button onclick="Auth.logoutFarmer()" class="btn btn-outline btn-sm" title="Logout">
          🚪 <span data-i18n="nav_logout">Logout</span>
        </button>
      `;
    } else {
      navAuth.innerHTML = `
        <a href="/login.html" class="btn btn-outline-primary btn-sm">
          <span data-i18n="nav_login">Farmer Login</span>
        </a>
        <a href="/register.html" class="btn btn-primary btn-sm">
          <span data-i18n="nav_register">Register</span>
        </a>
      `;
    }
    if (typeof applyTranslations === 'function') {
      applyTranslations();
    }
  }
};

// Preset Quick Logins (For Easy Testing & Demonstration)
const DEMO_FARMERS = {
  akif: {
    mobile: '7989725471',
    pass: '6472425227',
    name: 'Akif Quadri (Medchal, Telangana)'
  },
  ramesh: {
    mobile: '9876543210',
    pass: 'password123',
    name: 'Ramesh Kumar (Warangal - Active Token)'
  },
  lakshmi: {
    mobile: '9876543211',
    pass: 'password123',
    name: 'Lakshmi Devi (Kurnool - Processing)'
  },
  suresh: {
    mobile: '9876543212',
    pass: 'password123',
    name: 'Suresh Chandra (Indore - Scheduled)'
  }
};

async function quickDemoLogin(key) {
  const creds = DEMO_FARMERS[key];
  if (!creds) return;

  try {
    showToast(`Logging in as ${creds.name}...`, 'info');
    const res = await API.login(creds.mobile, creds.pass);
    if (res.success) {
      Auth.setFarmerSession(res.farmer, res.token);
      showToast(res.message, 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 500);
    }
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
}

// Auto update nav on page load
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateNav();
});
