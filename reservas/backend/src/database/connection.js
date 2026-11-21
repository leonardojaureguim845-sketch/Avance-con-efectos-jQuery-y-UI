/**
 * Conexión y utilidades de base de datos SQLite con node:sqlite
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { SCHEMA_SQL } = require('./schema');

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(config.dbPath);
    // Configurar rendimiento y llaves foráneas
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');

    // Inicializar tablas si no existen
    dbInstance.exec(SCHEMA_SQL);
  }
  return dbInstance;
}

function runTransaction(callback) {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (rbErr) {
      // Ignorar error si ya se hizo rollback
    }
    throw error;
  }
}

module.exports = {
  getDatabase,
  runTransaction
};
