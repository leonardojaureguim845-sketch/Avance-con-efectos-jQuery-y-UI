/**
 * Servicio de Auditoría de Base de Datos para CanchaPlus
 */
const { getDatabase } = require('../database/connection');

function recordAudit({ tabla, registro, accion, usuario = 'sistema', ip = '127.0.0.1', detalles = '' }) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO auditoria (tabla, registro, accion, usuario, ip, detalles)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      String(tabla),
      String(registro),
      String(accion),
      String(usuario),
      String(ip),
      typeof detalles === 'object' ? JSON.stringify(detalles) : String(detalles)
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
  }
}

function getAuditLogs(limit = 50) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id_auditoria, tabla, registro, accion, usuario, fecha_hora, ip, detalles
    FROM auditoria
    ORDER BY id_auditoria DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

module.exports = {
  recordAudit,
  getAuditLogs
};
