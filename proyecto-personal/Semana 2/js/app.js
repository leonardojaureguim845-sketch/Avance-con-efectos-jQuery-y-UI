(function () {
  'use strict';
  const el = (selector) => document.querySelector(selector);
  const menuToggle = el('#menuToggle');
  const mainNav = el('#mainNav');
  const toast = el('#toast');
  let toastTimer;

  function notify(message) {
    if (window.jQuery) {
      el('#toast').text(message).stop(true, true).fadeIn(180);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el('#toast').fadeOut(350), 2800);
    } else {
      toast.textContent = message;
      toast.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.style.display = 'none', 2800);
    }
  }
  window.showToast = notify;

  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.textContent = isOpen ? '×' : '☰';
    window.addLog('Navegación', isOpen ? 'Abrió el menú principal' : 'Cerró el menú principal');
  });
  mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
    window.addLog('Navegación', 'Visitó la sección ' + link.textContent.trim());
  }));

  if (window.jQuery) {
    $(document).ready(function () {
      $('.accordion-trigger').on('click', function () {
        const content = $(this).next('.accordion-content');
        $('.accordion-content').not(content).slideUp(220);
        const wasVisible = content.is(':visible');
        content.slideToggle(220);
        $('.accordion-trigger span').text('＋');
        $(this).find('span').text(wasVisible ? '＋' : '−');
        window.addLog('Acordeón', 'Abrió o cerró: ' + $(this).text().trim());
      });
    });
  } else {
    document.querySelectorAll('.accordion-trigger').forEach(button => button.addEventListener('click', () => {
      const content = button.nextElementSibling;
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    }));
  }

  el('#toggleLog').addEventListener('click', () => {
    if (window.jQuery) el('#logPanel').stop(true, true).fadeToggle(250);
    else el('#logPanel').hidden = !el('#logPanel').hidden;
  });
  el('#clearLog').addEventListener('click', () => {
    if (confirm('¿Deseas borrar el historial de esta demostración?')) {
      localStorage.removeItem('vibraLog');
      window.renderLog();
      notify('Bitácora limpiada');
    }
  });

  // Debounce: espera a que termine la escritura antes de ejecutar una búsqueda.
  window.debounce = function (callback, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => callback.apply(this, args), delay);
    };
  };
  // Throttle: limita la frecuencia de ejecución de un evento repetitivo.
  window.throttle = function (callback, limit) {
    let waiting = false;
    return function (...args) {
      if (!waiting) {
        callback.apply(this, args);
        waiting = true;
        setTimeout(() => waiting = false, limit);
      }
    };
  };

  // Ejemplo didáctico de Promise y async/await para simular una carga local.
  window.loadDemoData = async function () {
    const response = await new Promise(resolve => setTimeout(() => resolve({ ok: true }), 250));
    return response;
  };
  window.loadDemoData().then(result => {
    if (result.ok) window.addLog('Sistema', 'Catálogo de demostración preparado');
  });
})();
