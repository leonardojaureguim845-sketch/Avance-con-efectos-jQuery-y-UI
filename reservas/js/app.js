/*
 * CanchaPlus — bundle JavaScript del frontend.
 * Los módulos se ejecutan en el orden original y exponen sus APIs mediante window.CanchaPlus*.
 * jQuery y DOMPurify permanecen como dependencias de terceros en vendor/.
 */

/* ==================== api.js ==================== */
(function () {
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
})();

/* ==================== auth.js ==================== */
(function () {
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
})();

/* ==================== courts.js ==================== */
(function () {
/**
 * CANCHAPLUS — CATÁLOGO DE DEPORTES Y CANCHAS
 * Carga dinámica desde la Base de Datos con Sanitización DOMPurify y Lazy Loading
 * Incluye catálogo predefinido para visualización inmediata y soporte resiliente
 */

const DEFAULT_SPORTS = [
  { id_deporte: 1, codigo: 'futbol', nombre: 'Fútbol', descripcion: 'Césped sintético de alta durabilidad para partidos de fútbol sala y 5vs5.', icono: '⚽' },
  { id_deporte: 2, codigo: 'wally', nombre: 'Wally', descripcion: 'Cancha reglamentaria con paredes acolchadas y red oficial de wallybol.', icono: '🏐' },
  { id_deporte: 3, codigo: 'voley', nombre: 'Voleibol', descripcion: 'Superficie de parquet pulido de alto impacto para voleibol competitivo y formativo.', icono: '🏐' }
];

const DEFAULT_COURTS = [
  { id_cancha: 1, id_deporte: 1, nombre: 'Cancha Sintética Futsal 1', descripcion: 'Césped sintético monofilamento, iluminación LED nocturna y graderías.', precio_hora: 40.0, ubicacion: 'Arena Miraflores · Av. Bush', foto_url: 'assets/images/court-futbol.svg', deporte_codigo: 'futbol', deporte_nombre: 'Fútbol', estado: 'disponible' },
  { id_cancha: 2, id_deporte: 1, nombre: 'Cancha Sintética Futsal 2', descripcion: 'Campo techado con césped sintético 50mm y vestuarios con duchas calientes.', precio_hora: 45.0, ubicacion: 'Complejo San Pedro · Calle Nicolás Acosta', foto_url: 'assets/images/court-futbol2.svg', deporte_codigo: 'futbol', deporte_nombre: 'Fútbol', estado: 'disponible' },
  { id_cancha: 3, id_deporte: 2, nombre: 'Cancha de Wally A', descripcion: 'Paredes con recubrimiento de madera y goma eva reglamentaria, balón incluido.', precio_hora: 30.0, ubicacion: 'Arena Miraflores · 2do Nivel', foto_url: 'assets/images/court-wally.svg', deporte_codigo: 'wally', deporte_nombre: 'Wally', estado: 'disponible' },
  { id_cancha: 4, id_deporte: 2, nombre: 'Cancha de Wally B', descripcion: 'Cancha rápida climatizada con ventilación forzada para partidos intensos.', precio_hora: 30.0, ubicacion: 'Complejo San Pedro · Nivel 1', foto_url: 'assets/images/court-wally2.svg', deporte_codigo: 'wally', deporte_nombre: 'Wally', estado: 'disponible' },
  { id_cancha: 5, id_deporte: 3, nombre: 'Coliseo de Voleibol Central', descripcion: 'Piso de parquet amortiguado antideslizante con postes telescópicos.', precio_hora: 35.0, ubicacion: 'Coliseo Central · Calle México', foto_url: 'assets/images/court-voley.svg', deporte_codigo: 'voley', deporte_nombre: 'Voleibol', estado: 'disponible' }
];

const courtsModule = {
  sportsCache: [...DEFAULT_SPORTS],
  courtsCache: [...DEFAULT_COURTS],

  async init() {
    // Renderizado instantáneo de alta velocidad (sin saltos de diseño ni pantallas vacías)
    this.renderSports(this.sportsCache);
    this.populateSportSelects(this.sportsCache);
    this.renderCourts(this.courtsCache);

    // Sincronización en segundo plano con la Base de Datos SQLite
    await this.loadSports();
    await this.loadCourts();
  },

  getCourtById(id) {
    const numId = Number(id);
    return this.courtsCache.find(c => c.id_cancha === numId) || null;
  },

  async loadSports() {
    try {
      const res = await window.CanchaPlusAPI.getDeportes();
      if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
        this.sportsCache = res.data;
        this.renderSports(this.sportsCache);
        this.populateSportSelects(this.sportsCache);
        $('#headerConnectionBadge').removeClass('offline').html('● BD Conectada');
      }
    } catch (err) {
      console.info('Catálogo de deportes servido desde App Shell (Servidor backend desconectado):', err.message);
      $('#headerConnectionBadge').addClass('offline').html('● Servidor Desconectado');
    }
  },

  renderSports(sports) {
    const $container = $('#sportsGrid');
    $container.empty();

    sports.forEach(sport => {
      const cleanNombre = window.DOMPurify ? DOMPurify.sanitize(sport.nombre) : sport.nombre;
      const cleanDesc = window.DOMPurify ? DOMPurify.sanitize(sport.descripcion) : sport.descripcion;
      const cleanIcon = window.DOMPurify ? DOMPurify.sanitize(sport.icono || '⚽') : (sport.icono || '⚽');

      const cardHtml = `
        <article class="c-sport-card" data-sport-code="${sport.codigo}">
          <div class="c-sport-card__header">
            <span class="c-sport-card__symbol" aria-hidden="true">${cleanIcon}</span>
            <span class="c-sport-card__badge">TEMPORADA 2026</span>
          </div>
          <h3 class="c-sport-card__title">${cleanNombre}</h3>
          <p class="c-sport-card__desc">${cleanDesc}</p>
          <div class="c-sport-card__action">
            <span>VER CANCHAS Y HORARIOS</span>
            <span aria-hidden="true">→</span>
          </div>
        </article>
      `;

      const $card = $(cardHtml);
      $card.on('click', () => {
        window.CanchaPlusApp.selectSport(sport.codigo);
      });
      $container.append($card);
    });
  },

  async loadCourts(sportCode = '') {
    try {
      const res = await window.CanchaPlusAPI.getCanchas(sportCode);
      if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
        this.courtsCache = res.data;
        this.renderCourts(this.courtsCache);
        return;
      }
    } catch (err) {
      console.info('Catálogo de canchas servido desde App Shell:', err.message);
    }

    // Filtrar sobre caché predeterminado si el servidor no responde
    let courts = this.courtsCache;
    if (sportCode) {
      courts = courts.filter(c => c.deporte_codigo === sportCode || String(c.id_deporte) === String(sportCode));
    }
    this.renderCourts(courts);
  },

  renderCourts(courts) {
    const $container = $('#courtsGrid');
    $container.empty();

    if (!courts.length) {
      $container.html('<p class="c-empty-state">No se encontraron canchas para el deporte seleccionado.</p>');
      return;
    }

    courts.forEach(court => {
      const cleanNombre = window.DOMPurify ? DOMPurify.sanitize(court.nombre) : court.nombre;
      const cleanDeporte = window.DOMPurify ? DOMPurify.sanitize(court.deporte_nombre || 'Deporte') : (court.deporte_nombre || 'Deporte');
      const cleanUbicacion = window.DOMPurify ? DOMPurify.sanitize(court.ubicacion) : court.ubicacion;
      const cleanDesc = window.DOMPurify ? DOMPurify.sanitize(court.descripcion) : court.descripcion;
      const fotoUrl = court.foto_url || 'assets/images/court-futbol.svg';

      const cardHtml = `
        <article class="c-court-card" data-court-id="${court.id_cancha}">
          <div class="c-court-card__media">
            <img src="${fotoUrl}" 
                 alt="Fotografía de ${cleanNombre}" 
                 loading="lazy" 
                 decoding="async" 
                 width="800" 
                 height="500" 
                 class="c-court-card__img" />
            <div class="c-court-card__price-badge">
              Bs. <b>${court.precio_hora}</b> / hora
            </div>
          </div>
          <div class="c-court-card__body">
            <div class="c-court-card__location">
              <span>📍</span> <span>${cleanUbicacion}</span> · <b>${cleanDeporte}</b>
            </div>
            <h3 class="c-court-card__title">${cleanNombre}</h3>
            <p class="c-court-card__desc">${cleanDesc}</p>
            <button type="button" class="c-btn c-btn--primary c-btn--full c-btn--select-court" data-id="${court.id_cancha}">
              Reservar Cancha ↗
            </button>
          </div>
        </article>
      `;

      const $card = $(cardHtml);
      $card.find('.c-btn--select-court').on('click', () => {
        window.CanchaPlusApp.startBooking(court.id_cancha);
      });
      $container.append($card);
    });
  },

  populateSportSelects(sports) {
    const $select = $('#filterSportSelect');
    $select.find('option:not(:first)').remove();
    sports.forEach(s => {
      $select.append(`<option value="${s.codigo}">${s.nombre}</option>`);
    });
  }
};

window.CanchaPlusCourts = courtsModule;
})();

/* ==================== reservations.js ==================== */
(function () {
/**
 * CANCHAPLUS — GESTIÓN DE DISPONIBILIDAD Y RESERVAS REALES
 * Conectado directamente a la API REST y Base de Datos SQLite
 * Maneja estados sin conexión y persistencia garantizada
 */

const DEFAULT_HOURS_LIST = [
  '08:00', '09:00', '10:00', '11:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];

const reservationsModule = {
  currentCourt: null,
  selectedSlotTime: '',
  promoSeconds: 1800,
  promoTimer: null,
  myReservationCodesKey: 'canchaplus_my_codes',

  init() {
    this.bindEvents();
    this.setupDateInput();
    this.startPromoTimer();

    // Cancha inicial seleccionada
    this.selectCourtById(1);
  },

  setupDateInput() {
    const today = new Date();
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $('#resDate').attr('min', todayStr).val(todayStr);
  },

  bindEvents() {
    // Cambio de fecha o cancha en formulario de reserva
    $('#resDate').on('change', () => this.refreshAvailability());
    $('#resCourtSelect').on('change', (e) => {
      const courtId = $(e.target).val();
      if (courtId) this.selectCourtById(courtId);
    });

    // Horas y cálculo
    $('#resHours').on('input change', () => {
      this.validateHours();
      this.updatePriceSummary();
    });

    // Filtros de horario (Todos, Disponibles, Ocupados)
    $('.c-filter-btn').on('click', function() {
      $('.c-filter-btn').removeClass('active');
      $(this).addClass('active');
      const filter = $(this).data('filter');
      reservationsModule.applySlotFilter(filter);
    });

    // Validaciones en tiempo real
    $('#resName').on('input blur', () => this.validateName());
    $('#resPhone').on('input blur', () => this.validatePhone());

    // Botón Continuar hacia el Modal de Confirmación
    $('#btnOpenBookingModal').on('click', () => this.openConfirmationModal());

    // Botón Confirmar Reserva definitiva dentro del Modal
    $('#btnConfirmBooking').on('click', () => this.submitReservation());

    // Búsqueda en Mis Reservas
    $('#btnSearchMyReservations').on('click', () => this.loadMyReservations());
  },

  startPromoTimer() {
    clearInterval(this.promoTimer);
    this.promoSeconds = 1800;
    const format = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    $('#promoClock').text(format(this.promoSeconds));
    this.promoTimer = setInterval(() => {
      this.promoSeconds--;
      $('#promoClock').text(format(this.promoSeconds));
      if (this.promoSeconds <= 0) {
        clearInterval(this.promoTimer);
        $('#promoClock').text('00:00');
        $('#promoStatusText').text('La promoción de bienvenida ha finalizado.');
      }
    }, 1000);
  },

  async selectCourtById(courtId) {
    const cached = window.CanchaPlusCourts.getCourtById(courtId);
    if (cached) {
      this.currentCourt = cached;
    }

    try {
      const res = await window.CanchaPlusAPI.getCanchaById(courtId);
      if (res && res.data) {
        this.currentCourt = res.data;
      }
    } catch {}

    if (this.currentCourt) {
      $('#resCourtSelect').val(courtId);
      $('#bookingCourtTitle').text(this.currentCourt.nombre);
      $('#bookingCourtLocation').text(`${this.currentCourt.ubicacion} · ${this.currentCourt.deporte_nombre || 'Deporte'}`);
      $('#bookingRateDisplay').html(`Bs. <b>${this.currentCourt.precio_hora}</b> / hora`);
      
      this.selectedSlotTime = '';
      await this.refreshAvailability();
      this.updatePriceSummary();
    }
  },

  async refreshAvailability() {
    if (!this.currentCourt) return;

    const date = $('#resDate').val();
    const $grid = $('#timeSlotsGrid');

    try {
      const res = await window.CanchaPlusAPI.getDisponibilidad(this.currentCourt.id_cancha, date);
      const slots = res.data.horarios || [];
      $('#availabilityNotice').remove();
      this.renderSlots(slots);
      $('#headerConnectionBadge').removeClass('offline').html('● BD Conectada');
    } catch (err) {
      // Modo sin conexión / Fallback con slots estándar del sistema
      const fallbackSlots = DEFAULT_HOURS_LIST.map((h, i) => ({
        id_horario: i + 1,
        hora_inicio: h,
        disponible: true,
        estado: 'DISPONIBLE'
      }));

      this.renderSlots(fallbackSlots);
      if (!$('#availabilityNotice').length) {
        $grid.before(`
          <div id="availabilityNotice" style="font-size:0.8rem; padding:0.5rem 0.8rem; border-radius:var(--radius-sm); background:var(--color-surface-subtle); border-left:4px solid var(--color-accent); margin-bottom:0.75rem;">
            <b>ℹ️ Modo catálogo:</b> Se muestran los bloques horarios del sistema. Para consultar disponibilidad en vivo y persistir reservas, inicia tu servidor local (<code>node src/server.js</code>).
          </div>
        `);
      }
    }
  },

  renderSlots(slots) {
    const $grid = $('#timeSlotsGrid');
    $grid.empty();

    if (!slots.length) {
      $grid.html('<p class="c-empty-state">No hay horarios configurados para esta fecha.</p>');
      return;
    }

    slots.forEach(slot => {
      const isFree = slot.disponible;
      const statusClass = isFree ? 'c-slot--available' : 'c-slot--occupied';
      const labelText = isFree ? 'LIBRE' : 'OCUPADO';

      const $btn = $(`
        <button type="button" 
                class="c-slot ${statusClass}" 
                data-time="${slot.hora_inicio}" 
                data-status="${isFree ? 'available' : 'occupied'}"
                ${!isFree ? 'disabled' : ''}>
          <span>${slot.hora_inicio}</span>
          <small>${labelText}</small>
        </button>
      `);

      if (isFree) {
        $btn.on('click', () => {
          $('.c-slot').removeClass('c-slot--selected');
          $btn.addClass('c-slot--selected');
          this.selectedSlotTime = slot.hora_inicio;
          this.updatePriceSummary();
          window.CanchaPlusComponents.showToast(`Horario seleccionado: ${slot.hora_inicio}`, 'info');
        });
      }

      $grid.append($btn);
    });

    const activeFilter = $('.c-filter-btn.active').data('filter') || 'all';
    this.applySlotFilter(activeFilter);
  },

  applySlotFilter(filter) {
    $('#timeSlotsGrid .c-slot').each(function() {
      const st = $(this).data('status');
      if (filter === 'all' || filter === st) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  },

  updatePriceSummary() {
    const hours = parseInt($('#resHours').val(), 10) || 1;
    const rate = this.currentCourt ? this.currentCourt.precio_hora : 40;
    const total = hours * rate;

    $('#summarySelectedCourt').text(this.currentCourt ? this.currentCourt.nombre : 'Sin seleccionar');
    $('#summarySelectedTime').text(this.selectedSlotTime ? `${this.selectedSlotTime} (${hours} hr/s)` : 'Sin seleccionar');
    $('#summaryTotal').text(`Bs. ${total}`);

    // Promoción 2 horas
    if (hours >= 2 && this.promoSeconds > 0) {
      $('#promoGiftBadge').show().html('🎁 <b>¡Regalo destacado!</b> Reserva de 2+ horas incluye un agua de 2 litros.');
    } else {
      $('#promoGiftBadge').hide();
    }
  },

  validateName() {
    const val = $.trim($('#resName').val());
    const valid = val.length >= 3 && val.includes(' ');
    $('#resName').toggleClass('is-invalid', !valid).toggleClass('is-valid', valid);
    $('#nameError').text(valid ? '' : 'Ingresa tu nombre y apellido (mínimo 3 caracteres).');
    return valid;
  },

  validatePhone() {
    const val = $.trim($('#resPhone').val()).replace(/[\s()\-]/g, '');
    let digits = val;
    if (digits.startsWith('+591')) digits = digits.slice(4);
    else if (digits.startsWith('591') && digits.length === 11) digits = digits.slice(3);

    const valid = /^[67]\d{7}$/.test(digits);
    $('#resPhone').toggleClass('is-invalid', !valid).toggleClass('is-valid', valid);
    $('#phoneError').text(valid ? '' : 'Ingresa un celular boliviano válido (8 dígitos iniciando en 6 o 7).');
    return valid;
  },

  validateHours() {
    const h = parseInt($('#resHours').val(), 10);
    const valid = Number.isInteger(h) && h >= 1 && h <= 8;
    $('#resHours').toggleClass('is-invalid', !valid);
    $('#hoursError').text(valid ? '' : 'Elige de 1 a 8 horas.');
    return valid;
  },

  validateAll() {
    const okName = this.validateName();
    const okPhone = this.validatePhone();
    const okHours = this.validateHours();

    if (!this.currentCourt) {
      window.CanchaPlusComponents.showToast('Por favor selecciona una cancha deportiva.', 'error');
      return false;
    }

    if (!this.selectedSlotTime) {
      window.CanchaPlusComponents.showToast('Debes seleccionar un horario disponible.', 'error');
      return false;
    }

    return okName && okPhone && okHours;
  },

  openConfirmationModal() {
    if (!this.validateAll()) return;

    const name = $.trim($('#resName').val());
    const phone = $.trim($('#resPhone').val());
    const date = $('#resDate').val();
    const hours = parseInt($('#resHours').val(), 10);
    const total = this.currentCourt.precio_hora * hours;

    $('#modalCustomer').text(name);
    $('#modalPhone').text(phone);
    $('#modalDate').text(date);
    $('#modalCourt').text(this.currentCourt.nombre);
    $('#modalSport').text(this.currentCourt.deporte_nombre || 'Deporte');
    $('#modalTime').text(`${this.selectedSlotTime} (${hours} hora/s)`);
    $('#modalTotal').text(`Bs. ${total}`);
    $('#modalMethod').text('Pago Presencial en Cancha');

    $('#bookingModal').addClass('is-visible');
  },

  async submitReservation() {
    const $btn = $('#btnConfirmBooking');
    $btn.prop('disabled', true).text('Guardando en Base de Datos...');

    const payload = {
      id_cancha: this.currentCourt.id_cancha,
      fecha_reserva: $('#resDate').val(),
      hora_inicio: this.selectedSlotTime,
      cantidad_horas: parseInt($('#resHours').val(), 10),
      nombre_cliente: $.trim($('#resName').val()),
      telefono_cliente: $.trim($('#resPhone').val()),
      correo_cliente: $.trim($('#resEmail').val())
    };

    try {
      const res = await window.CanchaPlusAPI.createReserva(payload);
      const reserva = res.data;

      // Guardar código localmente para consulta en Mis Reservas
      this.saveLocalReservationCode(reserva.codigo_reserva);

      $('#bookingModal').removeClass('is-visible');
      window.CanchaPlusComponents.showToast('¡Reserva confirmada y registrada en el servidor!', 'success');

      // Mostrar Comprobante Oficial
      this.showReceiptModal(reserva);

      // Limpiar selección y refrescar disponibilidad real
      this.selectedSlotTime = '';
      await this.refreshAvailability();
      this.updatePriceSummary();

      // Log en bitácora
      window.CanchaPlusApp.addLog(`Reserva confirmada en BD: ${reserva.codigo_reserva} · ${reserva.cancha_nombre} · ${reserva.fecha_reserva} ${reserva.hora_inicio}`);
    } catch (err) {
      // Si el servidor está apagado o no se puede conectar
      $('#bookingModal').removeClass('is-visible');
      const errorMsg = err.isNetworkError
        ? `⚠️ SERVIDOR DESCONECTADO: No se pudo conectar con el backend (${window.CanchaPlusAPI.getBaseUrl()}). Para persistir reservas en la base de datos real, ejecuta "node src/server.js" en tu computadora o configura tu servidor con el botón "⚙️ Conexión API". (CanchaPlus no genera reservas ficticias para proteger la integridad de los datos).`
        : `Error al procesar reserva: ${err.message}`;
      
      alert(errorMsg);
      window.CanchaPlusComponents.showToast(err.message, 'error');
    } finally {
      $btn.prop('disabled', false).text('CONFIRMAR RESERVA');
    }
  },

  saveLocalReservationCode(code) {
    try {
      const codes = JSON.parse(localStorage.getItem(this.myReservationCodesKey)) || [];
      if (!codes.includes(code)) {
        codes.unshift(code);
        localStorage.setItem(this.myReservationCodesKey, JSON.stringify(codes.slice(0, 50)));
      }
    } catch {}
  },

  getLocalReservationCodes() {
    try {
      return JSON.parse(localStorage.getItem(this.myReservationCodesKey)) || [];
    } catch {
      return [];
    }
  },

  showReceiptModal(reserva) {
    $('#receiptCode').text(reserva.codigo_reserva);
    $('#receiptCustomer').text(reserva.nombre_cliente);
    $('#receiptPhone').text(reserva.telefono_cliente);
    $('#receiptCourt').text(reserva.cancha_nombre);
    $('#receiptDate').text(`${reserva.fecha_reserva} a las ${reserva.hora_inicio}`);
    $('#receiptDuration').text(`${reserva.cantidad_horas} hora(s)`);
    $('#receiptTotal').text(`Bs. ${reserva.precio_total}`);
    $('#receiptStatus').text(reserva.estado);

    $('#receiptModal').addClass('is-visible');
  },

  async loadMyReservations() {
    const $container = $('#myReservationsList');
    const searchVal = $.trim($('#myReservationsSearch').val());
    $container.html('<div class="c-loading-state">Consultando reservas...</div>');

    try {
      let reservas = [];
      if (searchVal) {
        if (searchVal.startsWith('CP-')) {
          const res = await window.CanchaPlusAPI.getReserva(searchVal);
          if (res && res.data) reservas = [res.data];
        } else {
          const res = await window.CanchaPlusAPI.getMisReservas({ telefono: searchVal, correo: searchVal });
          reservas = res.data || [];
        }
      } else {
        const codes = this.getLocalReservationCodes();
        if (codes.length > 0) {
          const promises = codes.slice(0, 10).map(c => window.CanchaPlusAPI.getReserva(c).catch(() => null));
          const results = await Promise.all(promises);
          reservas = results.filter(r => r && r.data).map(r => r.data);
        }
      }

      this.renderMyReservations(reservas);
    } catch (err) {
      $container.html(`
        <div class="c-empty-state">
          <p>⚠️ No se pudo conectar con el servidor backend.</p>
          <small>Inicia tu servidor con <code>node src/server.js</code> para consultar tus reservas en la base de datos real.</small>
        </div>
      `);
    }
  },

  renderMyReservations(reservas) {
    const $container = $('#myReservationsList');
    $container.empty();

    if (!reservas.length) {
      $container.html(`
        <div class="c-empty-state">
          <p>No se encontraron reservas registradas.</p>
          <small>Ingresa tu número de celular o código de reserva para buscarlas en el servidor.</small>
        </div>
      `);
      return;
    }

    reservas.forEach(r => {
      const isConfirmed = r.estado === 'CONFIRMADA';
      const cleanCourt = window.DOMPurify ? DOMPurify.sanitize(r.cancha_nombre || 'Cancha') : (r.cancha_nombre || 'Cancha');
      const cleanSport = window.DOMPurify ? DOMPurify.sanitize(r.deporte_nombre || 'Deporte') : (r.deporte_nombre || 'Deporte');

      const cardHtml = `
        <article class="c-panel" style="margin-bottom: 1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span class="c-badge ${isConfirmed ? 'c-badge--success' : 'c-badge--danger'}">${r.estado}</span>
              <b style="font-size:1.1rem; margin-left:0.5rem;">${r.codigo_reserva}</b>
            </div>
            <div style="font-weight:700; color:var(--color-brand-primary); font-size:1.15rem;">
              Bs. ${r.precio_total}
            </div>
          </div>
          <div style="margin: 0.75rem 0; font-size:0.9rem; color:var(--color-text-muted);">
            <div>🏟️ <b>${cleanCourt}</b> (${cleanSport})</div>
            <div>📅 Fecha: <b>${r.fecha_reserva}</b> · ⏰ Horario: <b>${r.hora_inicio}</b> (${r.cantidad_horas} hr)</div>
            <div>👤 Cliente: <b>${window.DOMPurify ? DOMPurify.sanitize(r.nombre_cliente) : r.nombre_cliente}</b> · 📞 ${r.telefono_cliente}</div>
          </div>
          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button class="c-btn c-btn--outline c-btn--sm btn-view-voucher" data-id="${r.id_reserva}">Ver Comprobante</button>
            ${isConfirmed ? `<button class="c-btn c-btn--danger c-btn--sm btn-cancel-booking" data-id="${r.id_reserva}" data-code="${r.codigo_reserva}">Cancelar Reserva</button>` : ''}
          </div>
        </article>
      `;

      const $el = $(cardHtml);
      $el.find('.btn-view-voucher').on('click', () => this.showReceiptModal(r));
      $el.find('.btn-cancel-booking').on('click', async () => {
        if (confirm(`¿Estás seguro de cancelar la reserva ${r.codigo_reserva}?`)) {
          try {
            await window.CanchaPlusAPI.cancelarReserva(r.id_reserva);
            window.CanchaPlusComponents.showToast('Reserva cancelada exitosamente.', 'success');
            await this.loadMyReservations();
            await this.refreshAvailability();
          } catch (err) {
            window.CanchaPlusComponents.showToast(`Error al cancelar: ${err.message}`, 'error');
          }
        }
      });

      $container.append($el);
    });
  }
};

window.CanchaPlusReservations = reservationsModule;
})();

/* ==================== components.js ==================== */
(function () {
/**
 * CANCHAPLUS — CONTROLADOR DE COMPONENTES INTERACTIVOS
 * Modales, Notificaciones Toast, Acordeones y Simulación Responsiva
 */

const componentsModule = {
  toastTimer: null,

  init() {
    this.bindModals();
    this.bindAccordions();
    this.bindSimulador();
    this.bindApiConfig();
  },

  showToast(message, type = 'info') {
    const $toast = $('#globalToast');
    clearTimeout(this.toastTimer);

    $toast.removeClass('toast--success toast--error toast--info');
    if (type === 'success') $toast.addClass('toast--success');
    else if (type === 'error') $toast.addClass('toast--error');
    else $toast.addClass('toast--info');

    $toast.text(message).stop(true, true).fadeIn(180);

    this.toastTimer = setTimeout(() => {
      $toast.fadeOut(240);
    }, 3500);
  },

  bindModals() {
    // Cerrar modal al pulsar botón de cerrar o fondo
    $(document).on('click', '.c-modal__close, .btn-close-modal', function() {
      $(this).closest('.c-modal-overlay').removeClass('is-visible');
    });

    $(document).on('click', '.c-modal-overlay', function(e) {
      if (e.target === this) {
        $(this).removeClass('is-visible');
      }
    });

    // Tecla Escape para accesibilidad
    $(document).on('keydown', (e) => {
      if (e.key === 'Escape') {
        $('.c-modal-overlay.is-visible').removeClass('is-visible');
      }
    });
  },

  bindAccordions() {
    $('.c-accordion__btn').on('click', function() {
      const $content = $(this).next('.c-accordion__content');
      $content.slideToggle(200);
      const $icon = $(this).find('.c-accordion__icon');
      $icon.text($icon.text() === '＋' ? '－' : '＋');
    });
  },

  bindSimulador() {
    $('#btnSimularVista').on('click', function() {
      const $stage = $('.c-app-container');
      const isSim = $stage.toggleClass('sim-movil').hasClass('sim-movil');
      $(this).attr('aria-pressed', String(isSim));
      $(this).text(isSim ? '📱 Vista Móvil Activa (Clic para restaurar)' : '📱 Simular vista móvil');
      window.CanchaPlusComponents.showToast(
        isSim ? 'Simulación móvil activada (390px contenedor)' : 'Modo responsivo estándar restaurado'
      );
    });
  },

  bindApiConfig() {
    // Botón para configurar la URL del backend (clave para GitHub Pages)
    $('#btnConfigApi').on('click', () => {
      const current = window.CanchaPlusAPI.getBaseUrl();
      $('#inputApiBaseUrl').val(current);
      $('#apiConfigModal').addClass('is-visible');
    });

    $('#btnSaveApiConfig').on('click', () => {
      const val = $.trim($('#inputApiBaseUrl').val());
      if (val) {
        window.CanchaPlusAPI.setBaseUrl(val);
        this.showToast(`URL de API actualizada a: ${val}`, 'success');
        $('#apiConfigModal').removeClass('is-visible');
        window.CanchaPlusCourts.init();
      }
    });
  }
};

window.CanchaPlusComponents = componentsModule;
})();

/* ==================== accessibility.js ==================== */
(function () {
/**
 * CANCHAPLUS — ACCESIBILIDAD WEB (A11Y) Y AUDITORÍA SEMÁNTICA
 */

const a11yModule = {
  init() {
    this.restoreTheme();
    this.bindThemeToggle();
    this.bindContrastToggle();
    this.bindSemanticAudit();
  },

  restoreTheme() {
    try {
      const saved = localStorage.getItem('canchaplus_theme');
      if (saved === 'dark') {
        $('body').addClass('dz-night-mode');
        $('#btnToggleTheme').html('☀️').attr('aria-label', 'Cambiar a modo claro').attr('aria-pressed', 'true');
      }
    } catch {}
  },

  bindThemeToggle() {
    $('#btnToggleTheme').on('click', function() {
      const isDark = $('body').toggleClass('dz-night-mode').hasClass('dz-night-mode');
      $(this).html(isDark ? '☀️' : '🌙')
             .attr('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')
             .attr('aria-pressed', String(isDark));
      try {
        localStorage.setItem('canchaplus_theme', isDark ? 'dark' : 'light');
      } catch {}
      window.CanchaPlusComponents.showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`);
    });
  },

  bindContrastToggle() {
    $('#btnToggleContrast').on('click', function() {
      const isHighContrast = $('body').toggleClass('high-contrast').hasClass('high-contrast');
      $(this).attr('aria-pressed', String(isHighContrast));
      window.CanchaPlusComponents.showToast(
        isHighContrast ? 'Modo de alto contraste activado' : 'Alto contraste desactivado'
      );
    });
  },

  bindSemanticAudit() {
    $('#btnRunSemanticAudit').on('click', () => {
      this.runAudit();
    });
  },

  runAudit() {
    // 1. Imágenes sin atributo alt
    const images = Array.from(document.querySelectorAll('img'));
    const missingAlt = images.filter(img => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '').length;

    // 2. Enlaces vacíos o sin texto accesible
    const links = Array.from(document.querySelectorAll('a'));
    const emptyLinks = links.filter(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      const hasImg = a.querySelector('img[alt]');
      return !href || (!text && !hasImg);
    }).length;

    // 3. Botones sin nombre accesible (sin texto y sin aria-label)
    const buttons = Array.from(document.querySelectorAll('button'));
    const unnamedButtons = buttons.filter(b => {
      const text = b.textContent.trim();
      const ariaLabel = b.getAttribute('aria-label');
      return !text && !ariaLabel;
    }).length;

    // 4. Inputs sin label o sin aria-label
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    const unlabelledInputs = inputs.filter(inp => {
      const id = inp.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAria = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
      return !hasLabel && !hasAria;
    }).length;

    // 5. Conteo de etiquetas semánticas HTML5
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'footer'];
    const semanticCount = semanticTags.reduce((sum, tag) => sum + document.querySelectorAll(tag).length, 0);

    const reportText = `Auditoría Semántica completada: ${semanticCount} etiquetas HTML5 semánticas identificadas · ${missingAlt} imágenes sin alt · ${emptyLinks} enlaces vacíos · ${unnamedButtons} botones sin nombre · ${unlabelledInputs} inputs sin label.`;

    $('#auditResultDisplay').text(reportText);
    window.CanchaPlusComponents.showToast('Auditoría semántica ejecutada con éxito', 'success');
    window.CanchaPlusApp.addLog(reportText);

    return {
      semanticCount,
      missingAlt,
      emptyLinks,
      unnamedButtons,
      unlabelledInputs
    };
  }
};

window.CanchaPlusA11y = a11yModule;
})();

/* ==================== smoke-test.js ==================== */
(function () {
/**
 * CANCHAPLUS — PANEL Y VERIFICADOR DE SMOKE TESTING
 * Realiza pruebas rápidas automáticas en el navegador para comprobar integridad antes de despliegue
 */

const smokeTestModule = {
  init() {
    $('#btnRunSmokeTests').on('click', () => this.runAllTests());
  },

  async runAllTests() {
    const $results = $('#smokeTestResults');
    $results.html('<div class="c-loading-state">Ejecutando Smoke Tests del sistema...</div>');

    const tests = [
      {
        name: '1. Carga de jQuery 3.7.1',
        run: () => typeof window.jQuery !== 'undefined' && window.jQuery.fn.jquery.startsWith('3.')
      },
      {
        name: '2. Disponibilidad de DOMPurify',
        run: () => typeof window.DOMPurify !== 'undefined' && typeof window.DOMPurify.sanitize === 'function'
      },
      {
        name: '3. Existencia de Manifest.json',
        run: () => !!document.querySelector('link[rel="manifest"]')
      },
      {
        name: '4. Soporte y Registro de Service Worker',
        run: () => 'serviceWorker' in navigator
      },
      {
        name: '5. Almacenamiento Local (localStorage)',
        run: () => {
          try {
            localStorage.setItem('__test__', '1');
            localStorage.removeItem('__test__');
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: '6. Conexión Backend API (/api/health)',
        run: async () => {
          const res = await window.CanchaPlusAPI.health();
          return res && res.ok && res.status === 'online';
        }
      },
      {
        name: '7. Consulta a Base de Datos (/api/deportes)',
        run: async () => {
          const res = await window.CanchaPlusAPI.getDeportes();
          return res && res.ok && Array.isArray(res.data) && res.data.length >= 3;
        }
      },
      {
        name: '8. Disponibilidad Real de Canchas (/api/canchas)',
        run: async () => {
          const res = await window.CanchaPlusAPI.getCanchas();
          return res && res.ok && Array.isArray(res.data) && res.data.length >= 1;
        }
      },
      {
        name: '9. Cálculo de Horarios en BD (/api/disponibilidad)',
        run: async () => {
          const today = new Date().toISOString().slice(0, 10);
          const res = await window.CanchaPlusAPI.getDisponibilidad(1, today);
          return res && res.ok && Array.isArray(res.data.horarios) && res.data.horarios.length > 0;
        }
      },
      {
        name: '10. Accesibilidad: Formularios con labels válidos',
        run: () => {
          const inputs = document.querySelectorAll('#resName, #resPhone, #resDate, #resHours');
          return Array.from(inputs).every(inp => document.querySelector(`label[for="${inp.id}"]`));
        }
      }
    ];

    let passed = 0;
    let failed = 0;
    const itemsHtml = [];

    for (const t of tests) {
      let isOk = false;
      let detail = '';
      try {
        isOk = await t.run();
      } catch (err) {
        isOk = false;
        detail = `(${err.message})`;
      }

      if (isOk) passed++;
      else failed++;

      itemsHtml.push(`
        <li style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--color-border);">
          <span>${t.name} <small style="color:var(--color-danger);">${detail}</small></span>
          <b class="${isOk ? 'c-badge c-badge--success' : 'c-badge c-badge--danger'}">${isOk ? 'APROBADO' : 'FALLIDO'}</b>
        </li>
      `);
    }

    const summaryHtml = `
      <div style="margin-bottom:1rem; padding:1rem; border-radius:var(--radius-md); background:var(--color-surface-subtle); display:flex; justify-content:space-around;">
        <div style="text-align:center;">
          <small style="color:var(--color-text-muted);">TOTAL PRUEBAS</small>
          <b style="display:block; font-size:1.5rem;">${tests.length}</b>
        </div>
        <div style="text-align:center;">
          <small style="color:var(--color-success);">APROBADAS</small>
          <b style="display:block; font-size:1.5rem; color:var(--color-success);">${passed}</b>
        </div>
        <div style="text-align:center;">
          <small style="color:var(--color-danger);">FALLIDAS</small>
          <b style="display:block; font-size:1.5rem; color:var(--color-danger);">${failed}</b>
        </div>
      </div>
      <ul style="list-style:none; padding:0; margin:0;">
        ${itemsHtml.join('')}
      </ul>
    `;

    $results.html(summaryHtml);
    window.CanchaPlusComponents.showToast(`Smoke Tests finalizados: ${passed}/${tests.length} aprobados`, passed === tests.length ? 'success' : 'error');
    window.CanchaPlusApp.addLog(`Smoke Tests completados: ${passed} aprobados, ${failed} fallidos.`);
  }
};

window.CanchaPlusSmokeTest = smokeTestModule;
})();

/* ==================== app.js ==================== */
(function () {
/**
 * CANCHAPLUS — CONTROLADOR PRINCIPAL DE LA APLICACIÓN (SPA)
 * Arquitectura unificada, responsiva y conectada a Base de Datos
 */

const app = {
  currentView: 'home',
  activityStorageKey: 'canchaplus_activity_v2',

  init() {
    this.bindNavigation();
    this.restoreActivityLog();
    this.initPWA();
    this.updateOnlineBadge();

    // Inicializar submódulos
    window.CanchaPlusAuth.updateAuthUI();
    window.CanchaPlusCourts.init();
    window.CanchaPlusReservations.init();
    window.CanchaPlusComponents.init();
    window.CanchaPlusA11y.init();
    window.CanchaPlusSmokeTest.init();

    // Eventos de conectividad
    window.addEventListener('online', () => this.updateOnlineBadge());
    window.addEventListener('offline', () => this.updateOnlineBadge());

    // Registro inicial en bitácora
    this.addLog('CanchaPlus iniciado exitosamente. Conectando con API y Base de Datos...');
  },

  bindNavigation() {
    // Clics en enlaces con atributo data-view (desktop y drawer)
    $(document).on('click', '[data-view]', (e) => {
      e.preventDefault();
      const targetView = $(e.currentTarget).data('view');
      this.navigate(targetView);
    });

    // Menú hamburguesa móvil
    $('#btnToggleMobileMenu').on('click', () => {
      const $drawer = $('#mobileDrawer');
      const isOpen = $drawer.toggleClass('is-open').hasClass('is-open');
      $('#btnToggleMobileMenu').attr('aria-expanded', String(isOpen));
    });

    // Cerrar drawer al hacer clic en un link
    $('#mobileDrawer .c-nav-link').on('click', () => {
      $('#mobileDrawer').removeClass('is-open');
      $('#btnToggleMobileMenu').attr('aria-expanded', 'false');
    });

    // Modal de Autenticación / Admin
    $('#navAuthBtn').on('click', () => {
      if (window.CanchaPlusAuth.isAuthenticated()) {
        const user = window.CanchaPlusAuth.getUser();
        if (confirm(`Sesión activa: ${user.nombre} (${user.rol})\n¿Deseas cerrar sesión?`)) {
          window.CanchaPlusAuth.clearSession();
          window.CanchaPlusComponents.showToast('Sesión cerrada.');
          this.navigate('home');
        }
      } else {
        $('#authModal').addClass('is-visible');
      }
    });

    $('#formAuthLogin').on('submit', async (e) => {
      e.preventDefault();
      const email = $('#loginEmail').val();
      const pass = $('#loginPassword').val();
      const $btn = $('#btnLoginSubmit');

      $btn.prop('disabled', true).text('Verificando...');
      try {
        const res = await window.CanchaPlusAPI.login(email, pass);
        window.CanchaPlusAuth.setSession(res.data.user, res.data.token);
        $('#authModal').removeClass('is-visible');
        window.CanchaPlusComponents.showToast(`¡Bienvenido ${res.data.user.nombre}!`, 'success');
        this.addLog(`Inicio de sesión: ${res.data.user.correo} (${res.data.user.rol})`);

        if (res.data.user.rol === 'admin') {
          this.navigate('admin');
        }
      } catch (err) {
        window.CanchaPlusComponents.showToast(err.message, 'error');
      } finally {
        $btn.prop('disabled', false).text('Iniciar Sesión');
      }
    });

    // Botones de bitácora
    $('#btnClearActivity').on('click', () => this.clearActivityLog());
  },

  navigate(viewId) {
    this.currentView = viewId;

    // Cambiar vistas visibles
    $('.c-view').removeClass('active').hide();
    $(`#view-${viewId}`).addClass('active').fadeIn(180);

    // Actualizar estados activos en navegación
    $('[data-view]').removeClass('active');
    $(`[data-view="${viewId}"]`).addClass('active');

    // Cargas perezosas específicas de la vista
    if (viewId === 'my-reservations') {
      window.CanchaPlusReservations.loadMyReservations();
    } else if (viewId === 'admin') {
      this.loadAdminPanel();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.addLog(`Navegación: Vista ${viewId.toUpperCase()}`);
  },

  selectSport(sportCode) {
    this.navigate('courts');
    $('#filterSportSelect').val(sportCode);
    window.CanchaPlusCourts.loadCourts(sportCode);
  },

  startBooking(courtId) {
    this.navigate('booking');
    window.CanchaPlusReservations.selectCourtById(courtId);
  },

  updateOnlineBadge() {
    const isOnline = navigator.onLine;
    const $badge = $('#headerConnectionBadge');

    if (isOnline) {
      $badge.removeClass('offline').html('● En línea · Servidor');
    } else {
      $badge.addClass('offline').html('● Sin conexión · PWA');
      window.CanchaPlusComponents.showToast('Sin conexión a Internet. Las funciones de reserva requieren conexión con el servidor.', 'error');
    }
  },

  initPWA() {
    // Registro de Service Worker
    if ('serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
          console.log('CanchaPlus PWA Service Worker registrado con éxito:', reg.scope);
        } catch (err) {
          console.warn('Registro de Service Worker:', err.message);
        }
      });
    }

    // Instalación PWA (beforeinstallprompt)
    let deferredPrompt = null;
    const $btnInstall = $('#btnPwaInstall');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $btnInstall.show();
    });

    $btnInstall.on('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        window.CanchaPlusComponents.showToast('¡Gracias por instalar CanchaPlus!', 'success');
      }
      deferredPrompt = null;
      $btnInstall.hide();
    });

    window.addEventListener('appinstalled', () => {
      $btnInstall.hide();
      this.addLog('Aplicación instalada como PWA en el dispositivo.');
    });
  },

  addLog(msg) {
    const time = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullMsg = `[${time}] ${msg}`;
    
    const $list = $('#activityList');
    $list.prepend(`<li>${DOMPurify.sanitize(fullMsg)}</li>`);

    // Máximo 40 registros
    $list.find('li:gt(40)').remove();

    this.saveActivityLog();
  },

  saveActivityLog() {
    try {
      const logs = $('#activityList li').map(function() { return $(this).text(); }).get();
      localStorage.setItem(this.activityStorageKey, JSON.stringify(logs.slice(0, 30)));
    } catch {}
  },

  restoreActivityLog() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.activityStorageKey)) || [];
      const $list = $('#activityList');
      if (saved.length > 0) {
        $list.empty();
        saved.forEach(item => {
          $list.append(`<li>${DOMPurify.sanitize(item)}</li>`);
        });
      }
    } catch {}
  },

  clearActivityLog() {
    $('#activityList').empty();
    localStorage.removeItem(this.activityStorageKey);
    window.CanchaPlusComponents.showToast('Bitácora de actividad limpiada.');
  },

  async loadAdminPanel() {
    if (!window.CanchaPlusAuth.isAdmin()) {
      window.CanchaPlusComponents.showToast('Requiere permisos de administrador.', 'error');
      this.navigate('home');
      return;
    }

    const $adminReservas = $('#adminReservationsList');
    const $adminAudit = $('#adminAuditList');

    $adminReservas.html('Cargando reservas...');
    $adminAudit.html('Cargando registros de auditoría de BD...');

    try {
      const [resReservas, resAudit] = await Promise.all([
        window.CanchaPlusAPI.getAllReservas(),
        window.CanchaPlusAPI.getAuditoria()
      ]);

      // Renderizar Reservas Admin
      const reservas = resReservas.data || [];
      if (!reservas.length) {
        $adminReservas.html('<p class="c-empty-state">No hay reservas registradas en el servidor.</p>');
      } else {
        $adminReservas.html(`
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:2px solid var(--color-border); text-align:left;">
                <th style="padding:0.5rem;">CÓDIGO</th>
                <th style="padding:0.5rem;">CANCHA</th>
                <th style="padding:0.5rem;">FECHA/HORA</th>
                <th style="padding:0.5rem;">CLIENTE</th>
                <th style="padding:0.5rem;">TOTAL</th>
                <th style="padding:0.5rem;">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              ${reservas.map(r => `
                <tr style="border-bottom:1px solid var(--color-border);">
                  <td style="padding:0.5rem;"><b>${r.codigo_reserva}</b></td>
                  <td style="padding:0.5rem;">${DOMPurify.sanitize(r.cancha_nombre)}</td>
                  <td style="padding:0.5rem;">${r.fecha_reserva} ${r.hora_inicio} (${r.cantidad_horas}h)</td>
                  <td style="padding:0.5rem;">${DOMPurify.sanitize(r.nombre_cliente)} (${r.telefono_cliente})</td>
                  <td style="padding:0.5rem;">Bs. ${r.precio_total}</td>
                  <td style="padding:0.5rem;"><span class="c-badge ${r.estado === 'CONFIRMADA' ? 'c-badge--success' : 'c-badge--danger'}">${r.estado}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `);
      }

      // Renderizar Auditoría Admin
      const audits = resAudit.data || [];
      if (!audits.length) {
        $adminAudit.html('<p class="c-empty-state">No hay eventos de auditoría registrados.</p>');
      } else {
        $adminAudit.html(`
          <ul style="list-style:none; padding:0; font-size:0.82rem;">
            ${audits.slice(0, 25).map(a => `
              <li style="padding:0.4rem 0; border-bottom:1px solid var(--color-border);">
                <b>[${a.fecha_hora}]</b> <span style="color:var(--color-brand-primary);">${a.accion}</span> en tabla <i>${a.tabla}</i> (ID: ${a.registro}) por <b>${DOMPurify.sanitize(a.usuario)}</b>
              </li>
            `).join('')}
          </ul>
        `);
      }
    } catch (err) {
      $adminReservas.html(`<p style="color:var(--color-danger);">${err.message}</p>`);
    }
  }
};

$(document).ready(() => {
  window.CanchaPlusApp = app;
  app.init();
});
})();
