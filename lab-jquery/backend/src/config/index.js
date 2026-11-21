/**
 * Configuración centralizada del backend CanchaPlus
 */
const path = require('node:path');
const fs = require('node:fs');

// Carga simple de variables desde .env si existe
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH 
    ? path.resolve(__dirname, '../../', process.env.DB_PATH)
    : path.resolve(__dirname, '../database/canchaplus.sqlite'),
  jwtSecret: process.env.JWT_SECRET || 'canchaplus_dev_secret_2026',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  adminUser: {
    nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    apellido: process.env.ADMIN_APELLIDO || 'CanchaPlus',
    correo: process.env.ADMIN_CORREO || 'admin@canchaplus.bo',
    telefono: process.env.ADMIN_TELEFONO || '70012345',
    password: process.env.ADMIN_PASSWORD || 'AdminCanchaPlus2026!'
  }
};

module.exports = config;
