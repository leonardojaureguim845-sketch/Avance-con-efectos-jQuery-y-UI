-- ============================================================
-- CANCHAPLUS — DATOS INICIALES (Supabase)
-- ============================================================

-- Deportes
INSERT INTO public.sports (codigo, nombre, descripcion, icono) VALUES
  ('futbol', 'Fútbol', 'Césped sintético de alta durabilidad para partidos de fútbol sala y 5vs5.', '⚽'),
  ('wally', 'Wally', 'Cancha reglamentaria con paredes acolchadas y red oficial de wallybol.', '🏐'),
  ('voley', 'Voleibol', 'Superficie de parquet pulido de alto impacto para voleibol competitivo y formativo.', '🏐')
ON CONFLICT (codigo) DO NOTHING;

-- Canchas (asumiendo ids de deportes 1,2,3)
INSERT INTO public.courts (id_deporte, nombre, descripcion, precio_hora, ubicacion, foto_url) VALUES
  (1, 'Cancha Sintética Futsal 1', 'Césped sintético monofilamento, iluminación LED nocturna y graderías.', 40.00, 'Arena Miraflores · Av. Bush', 'assets/images/court-futbol.svg'),
  (1, 'Cancha Sintética Futsal 2', 'Campo techado con césped sintético 50mm y vestuarios con duchas calientes.', 45.00, 'Complejo San Pedro · Calle Nicolás Acosta', 'assets/images/court-futbol2.svg'),
  (2, 'Cancha de Wally A', 'Paredes con recubrimiento de madera y goma eva reglamentaria, balón incluido.', 30.00, 'Arena Miraflores · 2do Nivel', 'assets/images/court-wally.svg'),
  (2, 'Cancha de Wally B', 'Cancha rápida climatizada con ventilación forzada para partidos intensos.', 30.00, 'Complejo San Pedro · Nivel 1', 'assets/images/court-wally2.svg'),
  (3, 'Coliseo de Voleibol Central', 'Piso de parquet amortiguado antideslizante con postes telescópicos.', 35.00, 'Coliseo Central · Calle México', 'assets/images/court-voley.svg')
ON CONFLICT DO NOTHING;

-- Horarios maestros
INSERT INTO public.schedules (hora_inicio, hora_fin) VALUES
  ('08:00','09:00'),('09:00','10:00'),('10:00','11:00'),('11:00','12:00'),
  ('14:00','15:00'),('15:00','16:00'),('16:00','17:00'),('17:00','18:00'),
  ('18:00','19:00'),('19:00','20:00'),('20:00','21:00'),('21:00','22:00'),
  ('22:00','23:00')
ON CONFLICT (hora_inicio, hora_fin) DO NOTHING;
