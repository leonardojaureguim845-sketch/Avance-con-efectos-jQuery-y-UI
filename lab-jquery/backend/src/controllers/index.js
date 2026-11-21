/**
 * Controladores de API REST para CanchaPlus
 */
const courtsService = require('../services/courtsService');
const bookingService = require('../services/bookingService');
const authService = require('../services/authService');
const auditService = require('../services/auditService');

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { ok: false, error: message });
}

const controllers = {
  // Healthcheck
  health(req, res) {
    sendJson(res, 200, {
      ok: true,
      service: 'CanchaPlus API',
      status: 'online',
      timestamp: new Date().toISOString()
    });
  },

  // Deportes
  getDeportes(req, res) {
    try {
      const sports = courtsService.getAllSports();
      sendJson(res, 200, { ok: true, data: sports });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Canchas
  getCanchas(req, res) {
    try {
      const canchas = courtsService.getAllCourts(req.query || {});
      sendJson(res, 200, { ok: true, data: canchas });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  getCanchaById(req, res) {
    try {
      const cancha = courtsService.getCourtById(req.params.id);
      if (!cancha) {
        return sendError(res, 404, 'Cancha deportiva no encontrada.');
      }
      sendJson(res, 200, { ok: true, data: cancha });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  getHorarios(req, res) {
    try {
      const horarios = courtsService.getAllMasterSchedules();
      sendJson(res, 200, { ok: true, data: horarios });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Disponibilidad real de base de datos
  getDisponibilidad(req, res) {
    try {
      const courtId = req.query.cancha_id || req.query.cancha;
      const date = req.query.fecha || req.query.date;

      if (!courtId || !date) {
        return sendError(res, 400, 'Los parámetros "cancha_id" y "fecha" (AAAA-MM-DD) son requeridos.');
      }

      const result = bookingService.getCourtAvailability(courtId, date);
      sendJson(res, 200, { ok: true, data: result });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  },

  // Crear Reserva
  createReserva(req, res) {
    try {
      const body = req.body || {};
      const ip = req.clientIp || '127.0.0.1';
      const userId = req.user ? req.user.id_usuario : (body.id_usuario || null);

      const reservation = bookingService.createReservation({
        id_cancha: body.id_cancha || body.cancha_id,
        fecha_reserva: body.fecha_reserva || body.fecha,
        hora_inicio: body.hora_inicio || body.hora,
        cantidad_horas: body.cantidad_horas || body.horas || 1,
        nombre_cliente: body.nombre_cliente || body.nombre,
        telefono_cliente: body.telefono_cliente || body.telefono,
        correo_cliente: body.correo_cliente || body.correo || '',
        id_usuario: userId,
        ip
      });

      sendJson(res, 201, {
        ok: true,
        message: 'Reserva confirmada y registrada en la base de datos.',
        data: reservation
      });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  },

  // Obtener Reserva por ID o Código
  getReserva(req, res) {
    try {
      const reserva = bookingService.getReservationDetails(req.params.id);
      if (!reserva) {
        return sendError(res, 404, 'Reserva no encontrada.');
      }
      sendJson(res, 200, { ok: true, data: reserva });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Consultar reservas de un usuario o por búsqueda
  getMisReservas(req, res) {
    try {
      const userId = req.user ? req.user.id_usuario : req.params.id;
      const telefono = req.query.telefono;
      const correo = req.query.correo;

      const reservas = bookingService.getReservationsByUser({
        id_usuario: userId,
        telefono,
        correo
      });

      sendJson(res, 200, { ok: true, data: reservas });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Cancelar reserva
  cancelarReserva(req, res) {
    try {
      const id = req.params.id;
      const usuario = req.user ? req.user.correo : 'cliente';
      const ip = req.clientIp || '127.0.0.1';

      const cancelled = bookingService.cancelReservation(id, usuario, ip);
      sendJson(res, 200, {
        ok: true,
        message: 'Reserva cancelada exitosamente.',
        data: cancelled
      });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  },

  // Todas las reservas (Admin)
  getAllReservas(req, res) {
    try {
      const reservas = bookingService.getAllReservations(req.query || {});
      sendJson(res, 200, { ok: true, data: reservas });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Autenticación
  registro(req, res) {
    try {
      const body = req.body || {};
      const ip = req.clientIp || '127.0.0.1';
      const result = authService.registerUser({ ...body, ip });
      sendJson(res, 201, {
        ok: true,
        message: 'Usuario registrado exitosamente.',
        data: result
      });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  },

  login(req, res) {
    try {
      const body = req.body || {};
      const ip = req.clientIp || '127.0.0.1';
      const result = authService.loginUser({ ...body, ip });
      sendJson(res, 200, {
        ok: true,
        message: 'Inicio de sesión exitoso.',
        data: result
      });
    } catch (err) {
      sendError(res, 401, err.message);
    }
  },

  perfil(req, res) {
    try {
      const user = authService.getUserById(req.user.id_usuario);
      if (!user) return sendError(res, 404, 'Usuario no encontrado.');
      sendJson(res, 200, { ok: true, data: user });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  logout(req, res) {
    // Al usar JWT sin estado, logout informa al cliente para eliminar el token del almacenamiento local
    sendJson(res, 200, { ok: true, message: 'Sesión finalizada exitosamente.' });
  },

  // Auditoría (Admin)
  getAuditoria(req, res) {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = auditService.getAuditLogs(limit);
      sendJson(res, 200, { ok: true, data: logs });
    } catch (err) {
      sendError(res, 500, err.message);
    }
  },

  // Crear Cancha (Admin)
  createCancha(req, res) {
    try {
      const admin = req.user ? req.user.correo : 'admin';
      const ip = req.clientIp || '127.0.0.1';
      const cancha = courtsService.createCourt(req.body, admin, ip);
      sendJson(res, 201, { ok: true, message: 'Cancha creada con éxito.', data: cancha });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  },

  // Actualizar Cancha (Admin)
  updateCancha(req, res) {
    try {
      const admin = req.user ? req.user.correo : 'admin';
      const ip = req.clientIp || '127.0.0.1';
      const cancha = courtsService.updateCourt(req.params.id, req.body, admin, ip);
      sendJson(res, 200, { ok: true, message: 'Cancha actualizada con éxito.', data: cancha });
    } catch (err) {
      sendError(res, 400, err.message);
    }
  }
};

module.exports = controllers;
