/**
 * Middleware de Autenticación y Autorización por Roles
 */
const { verifyToken } = require('../services/authService');

function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Acceso no autorizado: token requerido.' }));
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Token inválido o expirado.' }));
    return;
  }

  req.user = payload;
  next();
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user && req.user.rol === 'admin') {
      next();
    } else {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Acceso restringido: requiere rol de administrador.' }));
    }
  });
}

module.exports = {
  extractToken,
  authenticate,
  optionalAuth,
  requireAdmin
};
