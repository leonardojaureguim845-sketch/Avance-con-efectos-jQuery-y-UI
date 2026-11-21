/**
 * Script de Inicialización y Población de Datos Maestros (Seeds)
 * Se ejecuta de forma idempotente (no duplica si ya existen)
 */
const { getDatabase } = require('../src/database/connection');
const config = require('../src/config');
const { hashPassword } = require('../src/services/authService');
const { recordAudit } = require('../src/services/auditService');

function seedInitialData(options = { silent: false }) {
  const log = (...args) => { if (!options.silent) console.log(...args); };
  const db = getDatabase();

  log('🌱 Inicializando datos base en SQLite CanchaPlus...');

  // 1. Deportes
  const sports = [
    { codigo: 'futbol', nombre: 'Fútbol', descripcion: 'Césped sintético de alta durabilidad para partidos de fútbol sala y 5vs5.', icono: '⚽' },
    { codigo: 'wally', nombre: 'Wally', descripcion: 'Cancha reglamentaria con paredes acolchadas y red oficial de wallybol.', icono: '🏐' },
    { codigo: 'voley', nombre: 'Voleibol', descripcion: 'Superficie de parquet pulido de alto impacto para voleibol competitivo y formativo.', icono: '🏐' }
  ];

  const insertSport = db.prepare(`
    INSERT OR IGNORE INTO deportes (codigo, nombre, descripcion, icono, estado)
    VALUES (?, ?, ?, ?, 'activo')
  `);
  sports.forEach(s => insertSport.run(s.codigo, s.nombre, s.descripcion, s.icono));
  log('  ✔ Deportes inicializados.');

  // Obtener IDs de deportes
  const futbol = db.prepare("SELECT id_deporte FROM deportes WHERE codigo = 'futbol'").get();
  const wally = db.prepare("SELECT id_deporte FROM deportes WHERE codigo = 'wally'").get();
  const voley = db.prepare("SELECT id_deporte FROM deportes WHERE codigo = 'voley'").get();

  // 2. Canchas
  const courts = [
    { id_deporte: futbol.id_deporte, nombre: 'Cancha Sintética Futsal 1', descripcion: 'Césped sintético monofilamento, iluminación LED nocturna y graderías.', precio_hora: 40.0, ubicacion: 'Arena Miraflores · Av. Bush', foto_url: 'assets/images/court-futbol.svg' },
    { id_deporte: futbol.id_deporte, nombre: 'Cancha Sintética Futsal 2', descripcion: 'Campo techado con césped sintético 50mm y vestuarios con duchas calientes.', precio_hora: 45.0, ubicacion: 'Complejo San Pedro · Calle Nicolás Acosta', foto_url: 'assets/images/court-futbol2.svg' },
    { id_deporte: wally.id_deporte, nombre: 'Cancha de Wally A', descripcion: 'Paredes con recubrimiento de madera y goma eva reglamentaria, balón incluido.', precio_hora: 30.0, ubicacion: 'Arena Miraflores · 2do Nivel', foto_url: 'assets/images/court-wally.svg' },
    { id_deporte: wally.id_deporte, nombre: 'Cancha de Wally B', descripcion: 'Cancha rápida climatizada con ventilación forzada para partidos intensos.', precio_hora: 30.0, ubicacion: 'Complejo San Pedro · Nivel 1', foto_url: 'assets/images/court-wally2.svg' },
    { id_deporte: voley.id_deporte, nombre: 'Coliseo de Voleibol Central', descripcion: 'Piso de parquet amortiguado antideslizante con postes telescópicos.', precio_hora: 35.0, ubicacion: 'Coliseo Central · Calle México', foto_url: 'assets/images/court-voley.svg' }
  ];

  const countCanchas = db.prepare('SELECT count(*) as count FROM canchas').get().count;
  if (countCanchas === 0) {
    const insertCourt = db.prepare(`
      INSERT INTO canchas (id_deporte, nombre, descripcion, precio_hora, ubicacion, foto_url, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'disponible')
    `);
    courts.forEach(c => insertCourt.run(c.id_deporte, c.nombre, c.descripcion, c.precio_hora, c.ubicacion, c.foto_url));
    log('  ✔ Canchas inicializadas (5 canchas reales).');
  }

  // 3. Horarios Maestros (08:00 a 23:00)
  const hoursList = [
    ['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00'],
    ['14:00', '15:00'], ['15:00', '16:00'], ['16:00', '17:00'], ['17:00', '18:00'],
    ['18:00', '19:00'], ['19:00', '20:00'], ['20:00', '21:00'], ['21:00', '22:00'],
    ['22:00', '23:00']
  ];

  const insertHour = db.prepare(`
    INSERT OR IGNORE INTO horarios (hora_inicio, hora_fin, estado)
    VALUES (?, ?, 'activo')
  `);
  hoursList.forEach(([hi, hf]) => insertHour.run(hi, hf));
  log('  ✔ Horarios maestros registrados (13 bloques de 08:00 a 23:00).');

  // 4. Usuario Administrador Inicial Seguro
  const adminEmail = config.adminUser.correo;
  const existingAdmin = db.prepare('SELECT id_usuario FROM usuarios WHERE correo = ?').get(adminEmail);
  if (!existingAdmin) {
    const passHash = hashPassword(config.adminUser.password);
    const insertAdmin = db.prepare(`
      INSERT INTO usuarios (nombre, apellido, telefono, correo, password_hash, rol, estado)
      VALUES (?, ?, ?, ?, ?, 'admin', 'activo')
    `);
    insertAdmin.run(
      config.adminUser.nombre,
      config.adminUser.apellido,
      config.adminUser.telefono,
      adminEmail,
      passHash
    );
    log(`  ✔ Usuario Administrador creado: ${adminEmail}`);

    recordAudit({
      tabla: 'usuarios',
      registro: 'admin_seed',
      accion: 'SEED_INICIAL_ADMIN',
      usuario: adminEmail,
      ip: '127.0.0.1',
      detalles: { correo: adminEmail, rol: 'admin' }
    });
  }

  // 5. Reservas de Prueba Iniciales (para comprobar disponibilidad real)
  const countReservas = db.prepare('SELECT count(*) as count FROM reservas').get().count;
  if (countReservas === 0) {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const firstCourt = db.prepare('SELECT id_cancha FROM canchas LIMIT 1').get();

    if (firstCourt) {
      const demoReserva = db.prepare(`
        INSERT INTO reservas (
          codigo_reserva, nombre_cliente, telefono_cliente, correo_cliente,
          id_cancha, hora_inicio, fecha_reserva, cantidad_horas, precio_total, estado
        ) VALUES ('CP-2026-DEMO', 'Carlos Mamani', '71234567', 'carlos@demo.bo', ?, '19:00', ?, 1, 40.0, 'CONFIRMADA')
      `);
      demoReserva.run(firstCourt.id_cancha, todayStr);

      const lastId = db.prepare('SELECT last_insert_rowid() as id').get().id;
      db.prepare(`
        INSERT INTO pagos (id_reserva, monto, metodo, estado)
        VALUES (?, 40.0, 'EN_CANCHA', 'PENDIENTE')
      `).run(lastId);

      log(`  ✔ Reserva de prueba creada para hoy (${todayStr} 19:00).`);
    }
  }

  log('🎉 Base de Datos inicializada con éxito.');
}

if (require.main === module) {
  seedInitialData({ silent: false });
}

module.exports = { seedInitialData };
