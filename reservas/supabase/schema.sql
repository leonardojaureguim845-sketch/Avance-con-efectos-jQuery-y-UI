-- ============================================================
-- CANCHAPLUS — ESQUEMA SUPABASE (PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente','admin')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Deportes
CREATE TABLE IF NOT EXISTS public.sports (
  id_deporte SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  icono TEXT NOT NULL DEFAULT '⚽',
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
);

-- 3. Canchas
CREATE TABLE IF NOT EXISTS public.courts (
  id_cancha SERIAL PRIMARY KEY,
  id_deporte INTEGER NOT NULL REFERENCES public.sports(id_deporte) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio_hora NUMERIC(10,2) NOT NULL CHECK (precio_hora > 0),
  ubicacion TEXT NOT NULL,
  foto_url TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','mantenimiento','inactiva'))
);

-- 4. Horarios maestros
CREATE TABLE IF NOT EXISTS public.schedules (
  id_horario SERIAL PRIMARY KEY,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  UNIQUE (hora_inicio, hora_fin)
);

-- 5. Reservas
CREATE TABLE IF NOT EXISTS public.reservations (
  id_reserva SERIAL PRIMARY KEY,
  codigo_reserva TEXT NOT NULL UNIQUE,
  id_usuario UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre_cliente TEXT NOT NULL,
  telefono_cliente TEXT NOT NULL,
  correo_cliente TEXT DEFAULT '',
  id_cancha INTEGER NOT NULL REFERENCES public.courts(id_cancha) ON DELETE RESTRICT,
  id_horario INTEGER REFERENCES public.schedules(id_horario) ON DELETE SET NULL,
  hora_inicio TIME NOT NULL,
  fecha_reserva DATE NOT NULL,
  cantidad_horas INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_horas BETWEEN 1 AND 8),
  precio_total NUMERIC(10,2) NOT NULL CHECK (precio_total >= 0),
  estado TEXT NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA','CANCELADA','COMPLETADA')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Pagos
CREATE TABLE IF NOT EXISTS public.payments (
  id_pago SERIAL PRIMARY KEY,
  id_reserva INTEGER NOT NULL REFERENCES public.reservations(id_reserva) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
  metodo TEXT NOT NULL DEFAULT 'EN_CANCHA' CHECK (metodo IN ('EN_CANCHA','TRANSFERENCIA_PENDIENTE','QR_PENDIENTE')),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADO','ANULADO')),
  fecha_pago TIMESTAMPTZ
);

-- 7. Auditoría
CREATE TABLE IF NOT EXISTS public.audit_log (
  id_auditoria SERIAL PRIMARY KEY,
  tabla TEXT NOT NULL,
  registro TEXT NOT NULL,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL DEFAULT 'sistema',
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT NOT NULL DEFAULT '127.0.0.1',
  detalles JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reservations_court_date ON public.reservations(id_cancha, fecha_reserva, estado);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON public.reservations(telefono_cliente);
CREATE INDEX IF NOT EXISTS idx_courts_sport ON public.courts(id_deporte);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.audit_log(fecha_hora);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellido, telefono, correo, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    NEW.email,
    'cliente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
