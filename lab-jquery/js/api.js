/**
 * CANCHAPLUS — CLIENTE API REST
 * Permite configurar dinámicamente la URL del servidor backend
 * Maneja peticiones con autenticación y control de errores sin simulación ficticia
 */

const API_DEFAULT_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '3000' ? '/api' : 'http://localhost:3000/api')
  : (localStorage.getItem('canchaplus_api_url') || 'http://localhost:3000/api');

const api = {
  baseUrl: localStorage.getItem('canchaplus_api_url') || API_DEFAULT_URL,

  setBaseUrl(url) {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && !clean.includes('/api/')) {
      clean += '/api';
    }
    this.baseUrl = clean;
    localStorage.setItem('canchaplus_api_url', clean);
  },

  getBaseUrl() {
    return this.baseUrl;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = localStorage.getItem('canchaplus_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchConfig = {
      method: options.method || 'GET',
      headers
    };

    if (options.body) {
      fetchConfig.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchConfig);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : `Error HTTP ${response.status}: ${response.statusText}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (networkError) {
      if (networkError.status) {
        throw networkError;
      }
      // Error de red (servidor apagado, CORS bloqueado, sin internet)
      const err = new Error(
        `No se pudo conectar con el servidor backend en "${this.baseUrl}". Verifica que el servidor de Node.js esté ejecutándose (npm run dev o node src/server.js).`
      );
      err.isNetworkError = true;
      throw err;
    }
  },

  // Healthcheck
  async health() {
    return this.request('/health');
  },

  // Deportes
  async getDeportes() {
    return this.request('/deportes');
  },

  // Canchas
  async getCanchas(deporte = '') {
    const query = deporte ? `?deporte=${encodeURIComponent(deporte)}` : '';
    return this.request(`/canchas${query}`);
  },

  async getCanchaById(id) {
    return this.request(`/canchas/${id}`);
  },

  async getHorarios() {
    return this.request('/horarios');
  },

  // Disponibilidad real de base de datos
  async getDisponibilidad(canchaId, fecha) {
    return this.request(`/disponibilidad?cancha_id=${encodeURIComponent(canchaId)}&fecha=${encodeURIComponent(fecha)}`);
  },

  // Reservas
  async createReserva(reservaData) {
    return this.request('/reservas', {
      method: 'POST',
      body: reservaData
    });
  },

  async getReserva(idOrCode) {
    return this.request(`/reservas/${encodeURIComponent(idOrCode)}`);
  },

  async getMisReservas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/mis-reservas${query ? '?' + query : ''}`);
  },

  async cancelarReserva(idOrCode) {
    return this.request(`/reservas/${encodeURIComponent(idOrCode)}/cancelar`, {
      method: 'PATCH'
    });
  },

  async getAllReservas(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/reservas${query ? '?' + query : ''}`);
  },

  // Autenticación
  async login(correo, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { correo, password }
    });
  },

  async registro(userData) {
    return this.request('/auth/registro', {
      method: 'POST',
      body: userData
    });
  },

  async getPerfil() {
    return this.request('/auth/perfil');
  },

  // Auditoría (Admin)
  async getAuditoria() {
    return this.request('/auditoria');
  }
};

window.CanchaPlusAPI = api;
