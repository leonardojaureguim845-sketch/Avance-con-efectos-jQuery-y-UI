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
      $('#headerConnectionBadge').addClass('offline').html('● Modo catálogo (configura tu backend)');
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
