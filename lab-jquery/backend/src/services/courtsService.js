/**
 * Servicio de Deportes y Canchas para CanchaPlus
 */
const { getDatabase } = require('../database/connection');
const { recordAudit } = require('./auditService');

function getAllSports() {
  const db = getDatabase();
  return db.prepare(`
    SELECT id_deporte, codigo, nombre, descripcion, icono, estado
    FROM deportes
    WHERE estado = 'activo'
    ORDER BY id_deporte ASC
  `).all();
}

function getSportByCode(codigo) {
  const db = getDatabase();
  return db.prepare(`
    SELECT id_deporte, codigo, nombre, descripcion, icono, estado
    FROM deportes
    WHERE codigo = ? AND estado = 'activo'
  `).get(codigo);
}

function getAllCourts(filters = {}) {
  const db = getDatabase();
  let sql = `
    SELECT c.id_cancha, c.id_deporte, c.nombre, c.descripcion, c.precio_hora,
           c.ubicacion, c.foto_url, c.estado,
           d.codigo as deporte_codigo, d.nombre as deporte_nombre, d.icono as deporte_icono
    FROM canchas c
    INNER JOIN deportes d ON c.id_deporte = d.id_deporte
    WHERE c.estado != 'inactiva'
  `;
  const params = [];

  if (filters.deporte) {
    sql += ` AND (d.codigo = ? OR d.id_deporte = ?)`;
    params.push(filters.deporte, Number(filters.deporte) || 0);
  }

  sql += ` ORDER BY c.id_cancha ASC`;
  return db.prepare(sql).all(...params);
}

function getCourtById(id) {
  const db = getDatabase();
  return db.prepare(`
    SELECT c.id_cancha, c.id_deporte, c.nombre, c.descripcion, c.precio_hora,
           c.ubicacion, c.foto_url, c.estado,
           d.codigo as deporte_codigo, d.nombre as deporte_nombre, d.icono as deporte_icono
    FROM canchas c
    INNER JOIN deportes d ON c.id_deporte = d.id_deporte
    WHERE c.id_cancha = ?
  `).get(id);
}

function getAllMasterSchedules() {
  const db = getDatabase();
  return db.prepare(`
    SELECT id_horario, hora_inicio, hora_fin, estado
    FROM horarios
    WHERE estado = 'activo'
    ORDER BY hora_inicio ASC
  `).all();
}

function createCourt(courtData, adminUser = 'admin', ip = '127.0.0.1') {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO canchas (id_deporte, nombre, descripcion, precio_hora, ubicacion, foto_url, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    courtData.id_deporte,
    courtData.nombre,
    courtData.descripcion,
    courtData.precio_hora,
    courtData.ubicacion,
    courtData.foto_url || '',
    courtData.estado || 'disponible'
  );
  
  const created = db.prepare('SELECT * FROM canchas WHERE rowid = last_insert_rowid()').get();
  
  recordAudit({
    tabla: 'canchas',
    registro: created.id_cancha,
    accion: 'CREAR_CANCHA',
    usuario: adminUser,
    ip,
    detalles: created
  });

  return created;
}

function updateCourt(id, updates, adminUser = 'admin', ip = '127.0.0.1') {
  const db = getDatabase();
  const existing = getCourtById(id);
  if (!existing) throw new Error('Cancha no encontrada.');

  const fields = [];
  const params = [];

  if (updates.nombre !== undefined) { fields.push('nombre = ?'); params.push(updates.nombre); }
  if (updates.descripcion !== undefined) { fields.push('descripcion = ?'); params.push(updates.descripcion); }
  if (updates.precio_hora !== undefined) { fields.push('precio_hora = ?'); params.push(Number(updates.precio_hora)); }
  if (updates.ubicacion !== undefined) { fields.push('ubicacion = ?'); params.push(updates.ubicacion); }
  if (updates.estado !== undefined) { fields.push('estado = ?'); params.push(updates.estado); }
  if (updates.foto_url !== undefined) { fields.push('foto_url = ?'); params.push(updates.foto_url); }

  if (fields.length === 0) return existing;

  params.push(id);
  const sql = `UPDATE canchas SET ${fields.join(', ')} WHERE id_cancha = ?`;
  db.prepare(sql).run(...params);

  const updated = getCourtById(id);

  recordAudit({
    tabla: 'canchas',
    registro: id,
    accion: 'ACTUALIZAR_CANCHA',
    usuario: adminUser,
    ip,
    detalles: updates
  });

  return updated;
}

module.exports = {
  getAllSports,
  getSportByCode,
  getAllCourts,
  getCourtById,
  getAllMasterSchedules,
  createCourt,
  updateCourt
};
