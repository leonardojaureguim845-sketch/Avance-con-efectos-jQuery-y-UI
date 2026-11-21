/**
 * Definición del esquema DDL de la Base de Datos SQLite
 * Cumple con todas las tablas mínimas y restricciones de integridad
 */

const SCHEMA_SQL = `
-- Habilitar claves foráneas
PRAGMA foreign_keys = ON;

-- 1. Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Tabla Deportes
CREATE TABLE IF NOT EXISTS deportes (
  id_deporte INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  icono TEXT NOT NULL DEFAULT '⚽',
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- 3. Tabla Canchas
CREATE TABLE IF NOT EXISTS canchas (
  id_cancha INTEGER PRIMARY KEY AUTOINCREMENT,
  id_deporte INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio_hora REAL NOT NULL CHECK (precio_hora > 0),
  ubicacion TEXT NOT NULL,
  foto_url TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'mantenimiento', 'inactiva')),
  FOREIGN KEY (id_deporte) REFERENCES deportes(id_deporte) ON DELETE RESTRICT
);

-- 4. Tabla Horarios Maestros
CREATE TABLE IF NOT EXISTS horarios (
  id_horario INTEGER PRIMARY KEY AUTOINCREMENT,
  hora_inicio TEXT NOT NULL, -- Formato 'HH:00'
  hora_fin TEXT NOT NULL,    -- Formato 'HH:00'
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  UNIQUE(hora_inicio, hora_fin)
);

-- 5. Tabla Reservas
CREATE TABLE IF NOT EXISTS reservas (
  id_reserva INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_reserva TEXT NOT NULL UNIQUE,
  id_usuario INTEGER,
  nombre_cliente TEXT NOT NULL,
  telefono_cliente TEXT NOT NULL,
  correo_cliente TEXT DEFAULT '',
  id_cancha INTEGER NOT NULL,
  id_horario INTEGER,
  hora_inicio TEXT NOT NULL,
  fecha_reserva TEXT NOT NULL, -- Formato 'YYYY-MM-DD'
  cantidad_horas INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_horas >= 1 AND cantidad_horas <= 8),
  precio_total REAL NOT NULL CHECK (precio_total >= 0),
  estado TEXT NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA', 'CANCELADA', 'COMPLETADA')),
  fecha_creacion TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha) ON DELETE RESTRICT,
  FOREIGN KEY (id_horario) REFERENCES horarios(id_horario) ON DELETE SET NULL
);

-- 6. Tabla Pagos (Registro presencial o pendiente de garantía)
CREATE TABLE IF NOT EXISTS pagos (
  id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
  id_reserva INTEGER NOT NULL,
  monto REAL NOT NULL CHECK (monto >= 0),
  metodo TEXT NOT NULL DEFAULT 'EN_CANCHA' CHECK (metodo IN ('EN_CANCHA', 'TRANSFERENCIA_PENDIENTE', 'QR_PENDIENTE')),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'ANULADO')),
  fecha_pago TEXT DEFAULT NULL,
  FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
);

-- 7. Tabla Auditoría de Sistema
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria INTEGER PRIMARY KEY AUTOINCREMENT,
  tabla TEXT NOT NULL,
  registro TEXT NOT NULL,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL DEFAULT 'sistema',
  fecha_hora TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  ip TEXT NOT NULL DEFAULT '127.0.0.1',
  detalles TEXT DEFAULT ''
);

-- Índices de Rendimiento e Integridad
CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha ON reservas(id_cancha, fecha_reserva, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_telefono ON reservas(telefono_cliente);
CREATE INDEX IF NOT EXISTS idx_canchas_deporte ON canchas(id_deporte);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_hora);
`;

module.exports = { SCHEMA_SQL };
