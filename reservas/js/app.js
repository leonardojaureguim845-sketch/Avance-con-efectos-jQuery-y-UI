/**
 * CANCHAPLUS — CONTROLADOR PRINCIPAL DE LA APLICACIÓN (SPA)
 * Arquitectura unificada, responsiva y conectada a Base de Datos
 */

const app = {
  currentView: 'home',
  activityStorageKey: 'canchaplus_activity_v2',

  init() {
    window.addEventListener('error', (e) => {
      console.error('Error global:', e.message);
    });
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
    if (navigator.onLine && window.CanchaPlusReservations && typeof window.CanchaPlusReservations.syncPending === 'function') {
      window.CanchaPlusReservations.syncPending();
    }

    // Eventos de conectividad
    window.addEventListener('online', () => {
      this.updateOnlineBadge();
      if (window.CanchaPlusReservations && typeof window.CanchaPlusReservations.syncPending === 'function') {
        window.CanchaPlusReservations.syncPending();
      }
    });
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
    if (!viewId || !$(`#view-${viewId}`).length) {
      viewId = 'home';
    }
    this.currentView = viewId;

    try {
      // Cambiar vistas visibles
      $('.c-view').removeClass('active').hide();
      const $target = $(`#view-${viewId}`);
      if (!$target.length) {
        viewId = 'home';
      }
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
    } catch (err) {
      console.error('Error de navegación:', err);
      $('.c-view').removeClass('active').hide();
      $('#view-home').addClass('active').show();
      this.addLog('Error de navegación: se restauró Inicio');
    }
  },

  selectSport(sportCode) {
    this.navigate('courts');
    $('#filterSportSelect').val(sportCode);
    if (window.CanchaPlusCourts && typeof window.CanchaPlusCourts.loadCourts === 'function') {
      window.CanchaPlusCourts.loadCourts(sportCode);
    }
  },

  startBooking(courtId) {
    this.navigate('booking');
    if (window.CanchaPlusReservations && typeof window.CanchaPlusReservations.selectCourtById === 'function') {
      window.CanchaPlusReservations.selectCourtById(courtId);
    }
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
          const reg = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
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
                  <td style="padding:0.5rem;"><b>${DOMPurify.sanitize(String(r.codigo_reserva || ''))}</b></td>
                  <td style="padding:0.5rem;">${DOMPurify.sanitize(r.cancha_nombre)}</td>
                  <td style="padding:0.5rem;">${DOMPurify.sanitize(String(r.fecha_reserva || ''))} ${DOMPurify.sanitize(String(r.hora_inicio || ''))} (${Number(r.cantidad_horas) || 0}h)</td>
                  <td style="padding:0.5rem;">${DOMPurify.sanitize(String(r.nombre_cliente || ''))} (${DOMPurify.sanitize(String(r.telefono_cliente || ''))})</td>
                  <td style="padding:0.5rem;">Bs. ${Number(r.precio_total) || 0}</td>
                  <td style="padding:0.5rem;"><span class="c-badge ${r.estado === 'CONFIRMADA' ? 'c-badge--success' : 'c-badge--danger'}">${DOMPurify.sanitize(String(r.estado || ''))}</span></td>
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
      $adminReservas.html(`<p style="color:var(--color-danger);">${DOMPurify.sanitize(String(err.message || ''))}</p>`);
    }
  }
};

$(document).ready(() => {
  window.CanchaPlusApp = app;
  app.init();
});
