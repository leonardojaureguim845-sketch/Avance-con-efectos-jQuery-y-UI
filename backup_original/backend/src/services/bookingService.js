/**
 * Servicio de Reservas y Disponibilidad en Base de Datos Real
 * Implementa control de concurrencia y transacciones ACID para evitar reservas duplicadas
 */
const crypto = require('node:crypto');
const { getDatabase, runTransaction } = require('../database/connection');
const { getCourtById, getAllMasterSchedules } = require('./courtsService');
const { recordAudit } = require('./auditService');
const {
  validateName,
  validateBolivianPhone,
  validateEmail,
  validateDate,
  validateHours,
  validateTime
} = require('../validators/inputValidators');

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Consulta la disponibilidad real de horarios para una cancha y fecha específica
 */
function getCourtAvailability(courtId, dateStr) {
  const vDate = validateDate(dateStr);
  if (!vDate.valid) throw new Error(vDate.error);

  const court = getCourtById(courtId);
  if (!court) throw new Error('Cancha deportiva no encontrada.');

  const db = getDatabase();

  // Obtener todos los horarios maestros activos
  const masterSlots = db.prepare(`
    SELECT id_horario, hora_inicio, hora_fin
    FROM horarios
    WHERE estado = 'activo'
    ORDER BY hora_inicio ASC
  `).all();

  // Obtener todas las reservas activas (CONFIRMADA) para esa cancha y fecha
  const existingReservations = db.prepare(`
    SELECT id_reserva, hora_inicio, cantidad_horas, codigo_reserva
    FROM reservas
    WHERE id_cancha = ? AND fecha_reserva = ? AND estado = 'CONFIRMADA'
  `).all(courtId, vDate.value);

  // Mapear disponibilidad para cada horario
  const slotsAvailability = masterSlots.map(slot => {
    const slotStartMin = timeToMinutes(slot.hora_inicio);
    const slotEndMin = timeToMinutes(slot.hora_fin);

    // Verificar si alguna reserva existente se solapa con este intervalo
    const isOccupied = existingReservations.some(res => {
      const resStartMin = timeToMinutes(res.hora_inicio);
      const resEndMin = resStartMin + (res.cantidad_horas * 60);
      return slotStartMin < resEndMin && resStartMin < slotEndMin;
    });

    return {
      id_horario: slot.id_horario,
      hora_inicio: slot.hora_inicio,
      hora_fin: slot.hora_fin,
      disponible: !isOccupied,
      estado: !isOccupied ? 'DISPONIBLE' : 'OCUPADO'
    };
  });

  return {
    cancha: {
      id_cancha: court.id_cancha,
      nombre: court.nombre,
      deporte: court.deporte_nombre,
      deporte_codigo: court.deporte_codigo,
      precio_hora: court.precio_hora,
      ubicacion: court.ubicacion
    },
    fecha: vDate.value,
    horarios: slotsAvailability
  };
}

/**
 * Crea una nueva reserva utilizando una transacción segura
 * Evita condiciones de carrera y dobles reservas
 */
function createReservation({
  id_cancha,
  fecha_reserva,
  hora_inicio,
  cantidad_horas = 1,
  nombre_cliente,
  telefono_cliente,
  correo_cliente = '',
  id_usuario = null,
  ip = '127.0.0.1'
}) {
  // Validaciones estrictas de entrada
  const vName = validateName(nombre_cliente);
  if (!vName.valid) throw new Error(vName.error);

  const vPhone = validateBolivianPhone(telefono_cliente);
  if (!vPhone.valid) throw new Error(vPhone.error);

  const vEmail = validateEmail(correo_cliente, false);
  if (!vEmail.valid) throw new Error(vEmail.error);

  const vDate = validateDate(fecha_reserva);
  if (!vDate.valid) throw new Error(vDate.error);

  const vTime = validateTime(hora_inicio);
  if (!vTime.valid) throw new Error(vTime.error);

  const vHours = validateHours(cantidad_horas);
  if (!vHours.valid) throw new Error(vHours.error);

  const court = getCourtById(id_cancha);
  if (!court) throw new Error('La cancha deportiva seleccionada no existe.');
  if (court.estado !== 'disponible') {
    throw new Error(`La cancha "${court.nombre}" no está disponible para reservas (Estado: ${court.estado}).`);
  }

  const requestedStartMin = timeToMinutes(vTime.value);
  const requestedEndMin = requestedStartMin + (vHours.value * 60);
  const precioTotal = court.precio_hora * vHours.value;

  // Generar código único de reserva (ej: CP-2026-A8F2)
  const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const codigoReserva = `CP-${new Date().getFullYear()}-${codeSuffix}`;

  // Ejecutar dentro de una transacción atómica con bloqueo inmediato
  const newReservation = runTransaction((db) => {
    // 1. Verificar solapamiento dentro de la transacción
    const conflicts = db.prepare(`
      SELECT id_reserva, hora_inicio, cantidad_horas, codigo_reserva
      FROM reservas
      WHERE id_cancha = ? AND fecha_reserva = ? AND estado = 'CONFIRMADA'
    `).all(court.id_cancha, vDate.value);

    for (const res of conflicts) {
      const existingStartMin = timeToMinutes(res.hora_inicio);
      const existingEndMin = existingStartMin + (res.cantidad_horas * 60);

      if (requestedStartMin < existingEndMin && existingStartMin < requestedEndMin) {
        throw new Error(`El horario ${vTime.value} por ${vHours.value} hora(s) entra en conflicto con una reserva existente (${res.hora_inicio}). Por favor selecciona otro horario.`);
      }
    }

    // 2. Asociar id_horario maestro si coincide
    const matchedSlot = db.prepare(`
      SELECT id_horario FROM horarios WHERE hora_inicio = ? LIMIT 1
    `).get(vTime.value);
    const idHorario = matchedSlot ? matchedSlot.id_horario : null;

    // 3. Insertar la reserva
    const insertReserva = db.prepare(`
      INSERT INTO reservas (
        codigo_reserva, id_usuario, nombre_cliente, telefono_cliente, correo_cliente,
        id_cancha, id_horario, hora_inicio, fecha_reserva, cantidad_horas, precio_total, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA')
    `);

    insertReserva.run(
      codigoReserva,
      id_usuario || null,
      vName.value,
      vPhone.value,
      vEmail.value,
      court.id_cancha,
      idHorario,
      vTime.value,
      vDate.value,
      vHours.value,
      precioTotal
    );

    // Obtener la reserva recién creada
    const created = db.prepare(`
      SELECT r.*, c.nombre as cancha_nombre, c.precio_hora, d.nombre as deporte_nombre, d.codigo as deporte_codigo
      FROM reservas r
      INNER JOIN canchas c ON r.id_cancha = c.id_cancha
      INNER JOIN deportes d ON c.id_deporte = d.id_deporte
      WHERE r.codigo_reserva = ?
    `).get(codigoReserva);

    // 4. Crear registro en la tabla de pagos con estado PENDIENTE (pago presencial en cancha)
    // "No registrar pagos como realizados si no existe una integración real."
    const insertPago = db.prepare(`
      INSERT INTO pagos (id_reserva, monto, metodo, estado)
      VALUES (?, ?, 'EN_CANCHA', 'PENDIENTE')
    `);
    insertPago.run(created.id_reserva, precioTotal);

    // 5. Auditoría
    recordAudit({
      tabla: 'reservas',
      registro: created.id_reserva,
      accion: 'CREAR_RESERVA',
      usuario: vName.value,
      ip,
      detalles: {
        codigo: codigoReserva,
        cancha: court.nombre,
        fecha: vDate.value,
        hora: vTime.value,
        horas: vHours.value,
        total: precioTotal
      }
    });

    return created;
  });

  return newReservation;
}

/**
 * Obtener reserva por código o por ID
 */
function getReservationDetails(identifier) {
  const db = getDatabase();
  const isId = Number.isInteger(Number(identifier));
  
  const sql = `
    SELECT r.*, 
           c.nombre as cancha_nombre, c.ubicacion as cancha_ubicacion, c.precio_hora,
           d.nombre as deporte_nombre, d.codigo as deporte_codigo, d.icono as deporte_icono,
           p.id_pago, p.monto as pago_monto, p.metodo as pago_metodo, p.estado as pago_estado
    FROM reservas r
    INNER JOIN canchas c ON r.id_cancha = c.id_cancha
    INNER JOIN deportes d ON c.id_deporte = d.id_deporte
    LEFT JOIN pagos p ON r.id_reserva = p.id_reserva
    WHERE ${isId ? 'r.id_reserva = ?' : 'r.codigo_reserva = ?'}
  `;
  return db.prepare(sql).get(identifier);
}

/**
 * Obtener reservas de un usuario o por teléfono/correo
 */
function getReservationsByUser({ id_usuario, telefono, correo, limit = 50 }) {
  const db = getDatabase();
  const conditions = [];
  const params = [];

  if (id_usuario) {
    conditions.push('r.id_usuario = ?');
    params.push(id_usuario);
  }
  if (telefono) {
    const cleanPhone = telefono.replace(/[\s()\-]/g, '');
    const phoneNum = cleanPhone.startsWith('+591') ? cleanPhone.slice(4) : cleanPhone;
    conditions.push('(r.telefono_cliente = ? OR r.telefono_cliente LIKE ?)');
    params.push(phoneNum, `%${phoneNum}%`);
  }
  if (correo) {
    conditions.push('LOWER(r.correo_cliente) = ?');
    params.push(correo.trim().toLowerCase());
  }

  if (conditions.length === 0) {
    return [];
  }

  const sql = `
    SELECT r.*, 
           c.nombre as cancha_nombre, c.precio_hora,
           d.nombre as deporte_nombre, d.codigo as deporte_codigo, d.icono as deporte_icono,
           p.estado as pago_estado, p.metodo as pago_metodo
    FROM reservas r
    INNER JOIN canchas c ON r.id_cancha = c.id_cancha
    INNER JOIN deportes d ON c.id_deporte = d.id_deporte
    LEFT JOIN pagos p ON r.id_reserva = p.id_reserva
    WHERE ${conditions.join(' OR ')}
    ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC
    LIMIT ?
  `;
  params.push(limit);

  return db.prepare(sql).all(...params);
}

/**
 * Cancelar reserva
 */
function cancelReservation(idOrCode, usuario = 'usuario', ip = '127.0.0.1') {
  const reservation = getReservationDetails(idOrCode);
  if (!reservation) throw new Error('Reserva no encontrada.');

  if (reservation.estado === 'CANCELADA') {
    throw new Error('Esta reserva ya se encuentra cancelada.');
  }

  const db = getDatabase();
  return runTransaction((transDb) => {
    transDb.prepare(`
      UPDATE reservas SET estado = 'CANCELADA' WHERE id_reserva = ?
    `).run(reservation.id_reserva);

    transDb.prepare(`
      UPDATE pagos SET estado = 'ANULADO' WHERE id_reserva = ?
    `).run(reservation.id_reserva);

    recordAudit({
      tabla: 'reservas',
      registro: reservation.id_reserva,
      accion: 'CANCELAR_RESERVA',
      usuario,
      ip,
      detalles: {
        codigo: reservation.codigo_reserva,
        cancha: reservation.cancha_nombre,
        fecha: reservation.fecha_reserva
      }
    });

    return getReservationDetails(reservation.id_reserva);
  });
}

/**
 * Listado general para administración
 */
function getAllReservations(filters = {}, limit = 100) {
  const db = getDatabase();
  let sql = `
    SELECT r.*, 
           c.nombre as cancha_nombre, c.precio_hora,
           d.nombre as deporte_nombre, d.codigo as deporte_codigo, d.icono as deporte_icono,
           p.estado as pago_estado
    FROM reservas r
    INNER JOIN canchas c ON r.id_cancha = c.id_cancha
    INNER JOIN deportes d ON c.id_deporte = d.id_deporte
    LEFT JOIN pagos p ON r.id_reserva = p.id_reserva
    WHERE 1=1
  `;
  const params = [];

  if (filters.fecha) {
    sql += ` AND r.fecha_reserva = ?`;
    params.push(filters.fecha);
  }
  if (filters.cancha_id) {
    sql += ` AND r.id_cancha = ?`;
    params.push(Number(filters.cancha_id));
  }
  if (filters.estado) {
    sql += ` AND r.estado = ?`;
    params.push(filters.estado);
  }

  sql += ` ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params);
}

module.exports = {
  getCourtAvailability,
  createReservation,
  getReservationDetails,
  getReservationsByUser,
  cancelReservation,
  getAllReservations
};
