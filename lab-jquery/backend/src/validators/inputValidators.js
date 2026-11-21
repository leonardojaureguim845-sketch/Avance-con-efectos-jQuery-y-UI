/**
 * Validadores robustos de entrada para CanchaPlus
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
}

function validateName(name) {
  const clean = sanitizeString(name).replace(/\s+/g, ' ');
  if (!clean || clean.length < 3 || clean.length > 80) {
    return { valid: false, error: 'El nombre debe tener entre 3 y 80 caracteres.' };
  }
  // Mínimo dos palabras (nombre y apellido) con solo letras, tildes, guiones y espacios
  const nameRegex = /^[\p{L}][\p{L}'’ -]*$/u;
  const parts = clean.split(' ').filter(p => p.length >= 2);
  if (!nameRegex.test(clean) || parts.length < 2) {
    return { valid: false, error: 'Ingresa nombre y apellido válidos (solo letras y espacios).' };
  }
  return { valid: true, value: clean };
}

function validateBolivianPhone(phone) {
  const clean = sanitizeString(phone).replace(/[\s()\-]/g, '');
  let digits = clean;
  if (digits.startsWith('+591')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('591') && digits.length === 11) {
    digits = digits.slice(3);
  }

  // Celular en Bolivia: 8 dígitos empezando con 6 o 7
  const phoneRegex = /^[67]\d{7}$/;
  if (!phoneRegex.test(digits)) {
    return { 
      valid: false, 
      error: 'Ingresa un celular boliviano válido (8 dígitos iniciando con 6 o 7, ej: 70000000 o +591 70000000).' 
    };
  }
  return { valid: true, value: digits, formatted: `+591 ${digits}` };
}

function validateEmail(email, required = false) {
  const clean = sanitizeString(email).toLowerCase();
  if (!clean) {
    if (required) return { valid: false, error: 'El correo electrónico es requerido.' };
    return { valid: true, value: '' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'El correo electrónico tiene un formato inválido.' };
  }
  return { valid: true, value: clean };
}

function validateDate(dateStr) {
  const clean = sanitizeString(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return { valid: false, error: 'La fecha debe tener formato AAAA-MM-DD.' };
  }

  const d = new Date(clean + 'T00:00:00');
  if (isNaN(d.getTime())) {
    return { valid: false, error: 'La fecha proporcionada no es válida.' };
  }

  // Fecha no puede ser anterior a hoy
  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (clean < todayStr) {
    return { valid: false, error: 'No se pueden realizar reservas en fechas pasadas.' };
  }

  return { valid: true, value: clean };
}

function validateHours(hours) {
  const num = Number(hours);
  if (!Number.isInteger(num) || num < 1 || num > 8) {
    return { valid: false, error: 'La cantidad de horas debe ser un número entero entre 1 y 8.' };
  }
  return { valid: true, value: num };
}

function validateTime(timeStr) {
  const clean = sanitizeString(timeStr);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean)) {
    return { valid: false, error: 'El horario debe tener formato HH:MM (ej: 18:00).' };
  }
  return { valid: true, value: clean };
}

module.exports = {
  sanitizeString,
  validateName,
  validateBolivianPhone,
  validateEmail,
  validateDate,
  validateHours,
  validateTime
};
