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
    this.bindHydration();
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
  },

  bindHydration() {
    $('#btnHydratePage').on('click', () => {
      this.showToast('Hidratando la página...', 'info');
      setTimeout(() => location.reload(), 300);
    });
  }
};

window.CanchaPlusComponents = componentsModule;
