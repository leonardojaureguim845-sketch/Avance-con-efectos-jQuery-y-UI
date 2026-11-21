/**
 * CANCHAPLUS — MÓDULO DE AUTENTICACIÓN Y SESIONES
 */

const auth = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('canchaplus_user')) || null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('canchaplus_token') || null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.rol === 'admin';
  },

  setSession(user, token) {
    localStorage.setItem('canchaplus_user', JSON.stringify(user));
    localStorage.setItem('canchaplus_token', token);
    this.updateAuthUI();
  },

  clearSession() {
    localStorage.removeItem('canchaplus_user');
    localStorage.removeItem('canchaplus_token');
    this.updateAuthUI();
  },

  updateAuthUI() {
    const user = this.getUser();
    const isAuth = !!user;
    const isAdmin = user && user.rol === 'admin';

    // Botón de autenticación en navbar
    const $authBtn = $('#navAuthBtn');
    const $adminLinks = $('.admin-only-link');

    if (isAuth) {
      $authBtn.html(`<span>👤</span> ${window.DOMPurify ? DOMPurify.sanitize(user.nombre) : user.nombre}`)
              .attr('title', `Sesión iniciada como ${user.correo}`);
      $adminLinks.toggle(isAdmin);
    } else {
      $authBtn.html(`<span>🔑</span> Ingresar`).attr('title', 'Iniciar sesión o Administrar');
      $adminLinks.hide();
    }
  }
};

window.CanchaPlusAuth = auth;
