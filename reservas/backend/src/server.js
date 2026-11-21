/**
 * Servidor Principal CanchaPlus Backend
 * Node.js + SQLite nativo (node:sqlite)
 */
const http = require('node:http');
const config = require('./config');
const { handleRequest } = require('./app');
const { getDatabase } = require('./database/connection');
const { seedInitialData } = require('../seeds/init');

// Asegurar que la base de datos y datos maestros existan
try {
  getDatabase();
  seedInitialData({ silent: true });
} catch (err) {
  console.error('Error al inicializar la base de datos:', err);
}

const server = http.createServer(handleRequest);

server.listen(config.port, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  🏆 CANCHAPLUS — RESERVAS DEPORTIVAS (BACKEND API + DB)');
  console.log('================================================================');
  console.log(`  🚀 Servidor activo en:    http://localhost:${config.port}`);
  console.log(`  🌐 Base de Datos SQLite: ${config.dbPath}`);
  console.log(`  🩺 Healthcheck:          http://localhost:${config.port}/api/health`);
  console.log(`  ⚽ Deportes:             http://localhost:${config.port}/api/deportes`);
  console.log(`  🏟️ Canchas:              http://localhost:${config.port}/api/canchas`);
  console.log(`  📅 Disponibilidad:       http://localhost:${config.port}/api/disponibilidad?cancha_id=1&fecha=2026-11-21`);
  console.log('================================================================');
  console.log(`  👤 Admin por defecto:     ${config.adminUser.correo}`);
  console.log('  🔑 Clave admin: configurada en .env (ADMIN_PASSWORD).');
  console.log('================================================================');
});

// Manejo de apagado elegante
process.on('SIGINT', () => {
  console.log('\nCerrando servidor CanchaPlus...');
  server.close(() => {
    console.log('Servidor finalizado correctamente.');
    process.exit(0);
  });
});

module.exports = server;
