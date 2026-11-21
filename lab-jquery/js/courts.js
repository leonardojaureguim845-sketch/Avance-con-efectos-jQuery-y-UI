/**
 * CANCHAPLUS — CATÁLOGO DE DEPORTES Y CANCHAS
 * Carga dinámica desde la Base de Datos con Sanitización DOMPurify y Lazy Loading
 */

const courtsModule = {
  sportsCache: [],
  courtsCache: [],

  async init() {
    await this.loadSports();
    await this.loadCourts();
  },

  async loadSports() {
    const $container = $('#sportsGrid');
    $container.html('<div class="c-loading-state">Cargando deportes desde la base de datos...</div>');

    try {
      const res = await window.CanchaPlusAPI.getDeportes();
      this.sportsCache = res.data || [];
      this.renderSports(this.sportsCache);
      this.populateSportSelects(this.sportsCache);
    } catch (err) {
      console.warn('Error cargando deportes:', err);
      $container.html(`
        <div class="c-error-banner">
          <b>⚠️ Servidor desconectado</b>
          <p>${err.message}</p>
          <button class="c-btn c-btn--outline c-btn--sm" onclick="courtsModule.loadSports()">Reintentar conexión</button>
        </div>
      `);
    }
  },

  renderSports(sports) {
    const $container = $('#sportsGrid');
    $container.empty();

    if (!sports.length) {
      $container.html('<p class="c-empty-state">No hay deportes registrados en la base de datos.</p>');
      return;
    }

    sports.forEach(sport => {
      const cleanNombre = DOMPurify.sanitize(sport.nombre);
      const cleanDesc = DOMPurify.sanitize(sport.descripcion);
      const cleanIcon = DOMPurify.sanitize(sport.icono || '⚽');

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
    const $container = $('#courtsGrid');
    $container.html('<div class="c-loading-state">Consultando canchas disponibles...</div>');

    try {
      const res = await window.CanchaPlusAPI.getCanchas(sportCode);
      this.courtsCache = res.data || [];
      this.renderCourts(this.courtsCache);
    } catch (err) {
      console.warn('Error cargando canchas:', err);
      $container.html(`
        <div class="c-error-banner">
          <b>⚠️ No se pudieron obtener las canchas</b>
          <p>${err.message}</p>
        </div>
      `);
    }
  },

  renderCourts(courts) {
    const $container = $('#courtsGrid');
    $container.empty();

    if (!courts.length) {
      $container.html('<p class="c-empty-state">No se encontraron canchas para el deporte seleccionado.</p>');
      return;
    }

    courts.forEach(court => {
      const cleanNombre = DOMPurify.sanitize(court.nombre);
      const cleanDeporte = DOMPurify.sanitize(court.deporte_nombre);
      const cleanUbicacion = DOMPurify.sanitize(court.ubicacion);
      const cleanDesc = DOMPurify.sanitize(court.descripcion);
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
    const $select = $('#filterSportSelect, #bookingSportSelect');
    $select.find('option:not(:first)').remove();
    sports.forEach(s => {
      $select.append(`<option value="${s.codigo}">${s.nombre}</option>`);
    });
  }
};

window.CanchaPlusCourts = courtsModule;
