(function () {
  'use strict';
  const form = document.getElementById('contactForm');
  const fields = ['fullName', 'phone', 'email', 'interest', 'requestType'];
  const errors = {
    fullName: 'Escribe tu nombre y apellido (3 a 70 caracteres).',
    phone: 'Ingresa un celular boliviano válido: 8 dígitos que empiece en 6 o 7.',
    email: 'Ingresa un correo válido, por ejemplo nombre@correo.com.',
    interest: 'Selecciona una categoría de interés.',
    requestType: 'Selecciona el tipo de solicitud.'
  };
  function validate(id) {
    const input = document.getElementById(id);
    const value = input.value.trim();
    let valid = false;
    if (id === 'fullName') valid = value.length >= 3 && value.length <= 70 && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/.test(value);
    if (id === 'phone') {
      const digits = value.replace(/\D/g, '');
      valid = /^(?:591)?[67]\d{7}$/.test(digits) && (value.replace(/[\d+\s()-]/g, '') === '');
    }
    if (id === 'email') valid = value.length <= 100 && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value);
    if (id === 'interest' || id === 'requestType') valid = value !== '';
    input.classList.toggle('valid', valid);
    input.classList.toggle('invalid', !valid);
    document.getElementById(id + 'Error').textContent = valid ? '' : errors[id];
    return valid;
  }
  fields.forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => validate(id));
    input.addEventListener('input', () => { if (input.classList.contains('invalid') || input.classList.contains('valid')) validate(id); });
    input.addEventListener('change', () => validate(id));
  });
  document.getElementById('privacy').addEventListener('change', function () {
    document.getElementById('privacyError').textContent = this.checked ? '' : 'Debes aceptar el uso de datos para continuar.';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const results = fields.map(validate);
    const privacy = document.getElementById('privacy').checked;
    document.getElementById('privacyError').textContent = privacy ? '' : 'Debes aceptar el uso de datos para continuar.';
    if (results.every(Boolean) && privacy) {
      const data = Object.fromEntries(new FormData(form).entries());
      const requests = JSON.parse(localStorage.getItem('vibraRequests') || '[]');
      requests.push({ name: data.fullName, phone: data.phone, email: data.email, interest: data.interest, type: data.requestType, timestamp: new Date().toISOString() });
      localStorage.setItem('vibraRequests', JSON.stringify(requests));
      window.addLog('Formulario', 'Solicitud registrada localmente de ' + data.fullName + ' (' + data.interest + ')');
      window.showToast('¡Solicitud registrada! Gracias por contactarnos.');
      form.reset();
      fields.forEach(id => document.getElementById(id).classList.remove('valid', 'invalid'));
    } else {
      const firstInvalid = fields.find((id, index) => !results[index]);
      if (firstInvalid) document.getElementById(firstInvalid).focus();
      window.addLog('Formulario', 'Intentó enviar el formulario con datos incompletos o inválidos');
      window.showToast('Revisa los campos marcados antes de continuar.');
    }
  });
})();
