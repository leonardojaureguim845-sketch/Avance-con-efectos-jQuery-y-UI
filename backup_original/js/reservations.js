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
