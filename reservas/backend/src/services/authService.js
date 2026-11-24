/**
 * Servicio de Autenticación y Criptografía de Usuarios
 * Implementa hashing PBKDF2 con sal y tokens criptográficos HMAC SHA-256
 */
const crypto = require('node:crypto');
const { getDatabase } = require('../database/connection');
const config = require('../config');
const { recordAudit } = require('./auditService');
const { validateEmail, validateBolivianPhone, validateName } = require('../validators/inputValidators');

// Criptografía de contraseñas
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(key, 'hex'));
}

// Generación y verificación de tokens de sesión
function generateToken(payload, expiresInHours = 24) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (expiresInHours * 3600),
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  if (signature !== expectedSignature) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

function registerUser({ nombre, apellido, telefono, correo, password, rol = 'cliente', ip = '127.0.0.1' }) {
  const vName = validateName(`${nombre} ${apellido}`);
  if (!vName.valid) throw new Error(vName.error);
  
  const vPhone = validateBolivianPhone(telefono);
  if (!vPhone.valid) throw new Error(vPhone.error);
  
  const vEmail = validateEmail(correo, true);
  if (!vEmail.valid) throw new Error(vEmail.error);
  
  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id_usuario FROM usuarios WHERE correo = ?').get(vEmail.value);
  if (existing) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
  }

  const passHash = hashPassword(password);
  const stmt = db.prepare(`
    INSERT INTO usuarios (nombre, apellido, telefono, correo, password_hash, rol, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'activo')
  `);
  
  stmt.run(nombre.trim(), apellido.trim(), vPhone.value, vEmail.value, passHash, rol === 'admin' ? 'admin' : 'cliente');
  const user = db.prepare('SELECT id_usuario, nombre, apellido, telefono, correo, rol, estado, fecha_creacion FROM usuarios WHERE correo = ?').get(vEmail.value);

  recordAudit({
    tabla: 'usuarios',
    registro: user.id_usuario,
    accion: 'REGISTRO_USUARIO',
    usuario: user.correo,
    ip,
    detalles: { rol: user.rol }
  });

  const token = generateToken({
    id_usuario: user.id_usuario,
    correo: user.correo,
    rol: user.rol,
    nombre: `${user.nombre} ${user.apellido}`
  });

  return { user, token };
}

function loginUser({ correo, password, ip = '127.0.0.1' }) {
  const vEmail = validateEmail(correo, true);
  if (!vEmail.valid) throw new Error(vEmail.error);
  if (!password) throw new Error('Ingresa tu contraseña.');

  const db = getDatabase();
  const user = db.prepare(`
    SELECT id_usuario, nombre, apellido, telefono, correo, password_hash, rol, estado, fecha_creacion
    FROM usuarios
    WHERE correo = ?
  `).get(vEmail.value);

  if (!user) {
    throw new Error('Credenciales incorrectas o usuario no encontrado.');
  }

  if (user.estado !== 'activo') {
    throw new Error('Esta cuenta se encuentra inactiva. Contacta al administrador.');
  }

  if (!verifyPassword(password, user.password_hash)) {
    throw new Error('Credenciales incorrectas o usuario no encontrado.');
  }

  recordAudit({
    tabla: 'usuarios',
    registro: user.id_usuario,
    accion: 'LOGIN_EXITOSO',
    usuario: user.correo,
    ip,
    detalles: { rol: user.rol }
  });

  const token = generateToken({
    id_usuario: user.id_usuario,
    correo: user.correo,
    rol: user.rol,
    nombre: `${user.nombre} ${user.apellido}`
  });

  const safeUser = {
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
    fecha_creacion: user.fecha_creacion
  };

  return { user: safeUser, token };
}

function getUserById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT id_usuario, nombre, apellido, telefono, correo, rol, estado, fecha_creacion
    FROM usuarios WHERE id_usuario = ?
  `).get(id);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById
};
