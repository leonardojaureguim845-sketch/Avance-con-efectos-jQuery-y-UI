/**
 * Suite de Pruebas Automatizadas para CanchaPlus Backend
 * Ejecutable con: node tests/api.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const server = require('../src/server');
const config = require('../src/config');
const { validateBolivianPhone, validateDate, validateName } = require('../src/validators/inputValidators');

const BASE_URL = `http://127.0.0.1:${config.port}`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

test('1. Validadores de entrada', async (t) => {
  await t.test('Valida celulares bolivianos correctamente', () => {
    assert.equal(validateBolivianPhone('71234567').valid, true);
    assert.equal(validateBolivianPhone('60012345').valid, true);
    assert.equal(validateBolivianPhone('+591 71234567').valid, true);
    assert.equal(validateBolivianPhone('591 60012345').valid, true);
    
    // Inválidos
    assert.equal(validateBolivianPhone('2123456').valid, false); // Fijo o muy corto
    assert.equal(validateBolivianPhone('81234567').valid, false); // Empieza en 8
    assert.equal(validateBolivianPhone('12345').valid, false);
    assert.equal(validateBolivianPhone('abcde').valid, false);
  });

  await t.test('Valida fechas no pasadas', () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(validateDate(today).valid, true);
    assert.equal(validateDate('2020-01-01').valid, false); // Pasada
    assert.equal(validateDate('fecha-invalida').valid, false);
  });

  await t.test('Valida nombre y apellido', () => {
    assert.equal(validateName('Juan Pérez').valid, true);
    assert.equal(validateName('Ana María Flores').valid, true);
    assert.equal(validateName('J').valid, false);
    assert.equal(validateName('SoloUno').valid, false);
  });
});

test('2. Endpoints Públicos de Consulta', async (t) => {
  await t.test('GET /api/health retorna 200 y status online', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'online');
  });

  await t.test('GET /api/deportes retorna deportes activos', async () => {
    const res = await request('/api/deportes');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 3);
    const codes = res.data.data.map(d => d.codigo);
    assert.ok(codes.includes('futbol'));
    assert.ok(codes.includes('wally'));
    assert.ok(codes.includes('voley'));
  });

  await t.test('GET /api/canchas retorna canchas con su deporte asociado', async () => {
    const res = await request('/api/canchas');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 5);
    const first = res.data.data[0];
    assert.ok(first.nombre);
    assert.ok(first.precio_hora > 0);
    assert.ok(first.deporte_nombre);
  });

  await t.test('GET /api/disponibilidad calcula horarios libres y ocupados reales', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(`/api/disponibilidad?cancha_id=1&fecha=${today}`);
    assert.equal(res.status, 200);
    assert.ok(res.data.data.horarios.length > 0);
    
    // El slot de las 19:00 fue reservado en el seed
    const slot19 = res.data.data.horarios.find(h => h.hora_inicio === '19:00');
    assert.ok(slot19, 'Debe existir el slot de las 19:00');
    assert.equal(slot19.disponible, false, 'El slot de las 19:00 debe figurar como ocupado');
  });
});

test('3. Transacciones y Prevención de Reservas Duplicadas', async (t) => {
  // Generar fecha futura aleatoria para asegurar idempotencia en múltiples ejecuciones
  const randomDays = Math.floor(Math.random() * 200) + 10;
  const testDate = new Date(Date.now() + randomDays * 86400000).toISOString().slice(0, 10);
  let createdReservaId = null;
  let createdCodigo = null;

  await t.test('POST /api/reservas crea una reserva válida', async () => {
    const payload = {
      id_cancha: 1,
      fecha_reserva: testDate,
      hora_inicio: '20:00',
      cantidad_horas: 1,
      nombre_cliente: 'Roberto Gómez',
      telefono_cliente: '77889900',
      correo_cliente: 'roberto@test.bo'
    };

    const res = await request('/api/reservas', { method: 'POST', body: payload });
    assert.equal(res.status, 201);
    assert.equal(res.data.ok, true);
    assert.ok(res.data.data.codigo_reserva);
    createdReservaId = res.data.data.id_reserva;
    createdCodigo = res.data.data.codigo_reserva;
  });

  await t.test('POST /api/reservas RECHAZA duplicar reserva en el mismo horario', async () => {
    const duplicatePayload = {
      id_cancha: 1,
      fecha_reserva: testDate,
      hora_inicio: '20:00', // Mismo horario
      cantidad_horas: 1,
      nombre_cliente: 'Otro Usuario',
      telefono_cliente: '71122334',
      correo_cliente: 'otro@test.bo'
    };

    const res = await request('/api/reservas', { method: 'POST', body: duplicatePayload });
    assert.equal(res.status, 400);
    assert.equal(res.data.ok, false);
    assert.match(res.data.error, /conflicto|ya se encuentra reservado/i);
  });

  await t.test('PATCH /api/reservas/:id/cancelar cancela la reserva', async () => {
    const res = await request(`/api/reservas/${createdReservaId}/cancelar`, { method: 'PATCH' });
    assert.equal(res.status, 200);
    assert.equal(res.data.data.estado, 'CANCELADA');
  });

  await t.test('Tras cancelación, el horario queda disponible nuevamente', async () => {
    const rebookPayload = {
      id_cancha: 1,
      fecha_reserva: testDate,
      hora_inicio: '20:00',
      cantidad_horas: 1,
      nombre_cliente: 'Usuario Rebooking',
      telefono_cliente: '76543210',
      correo_cliente: 'rebook@test.bo'
    };

    const res = await request('/api/reservas', { method: 'POST', body: rebookPayload });
    assert.equal(res.status, 201);
    assert.equal(res.data.ok, true);
  });
});

test('4. Autenticación y Seguridad', async (t) => {
  let adminToken = null;

  await t.test('POST /api/auth/login con credenciales de admin', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        correo: config.adminUser.correo,
        password: config.adminUser.password
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.ok(res.data.data.token);
    assert.equal(res.data.data.user.rol, 'admin');
    adminToken = res.data.data.token;
  });

  await t.test('GET /api/reservas (Admin) requiere token válido', async () => {
    // Sin token
    const resNoAuth = await request('/api/reservas');
    assert.equal(resNoAuth.status, 401);

    // Con token admin
    const resAuth = await request('/api/reservas', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resAuth.status, 200);
    assert.ok(Array.isArray(resAuth.data.data));
  });

  await t.test('GET /api/auditoria registra los eventos del sistema', async () => {
    const res = await request('/api/auditoria', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length > 0);
  });
});

// Cerrar el servidor al finalizar los tests
test.after(() => {
  server.close();
});
