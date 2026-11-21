-- ============================================================
-- CANCHAPLUS — POLÍTICAS RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada usuario ve/edita el suyo; admin ve todos
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'admin'));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Deportes y canchas: lectura pública, escritura solo admin
CREATE POLICY "sports_read_all" ON public.sports FOR SELECT USING (true);
CREATE POLICY "sports_admin_write" ON public.sports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "courts_read_all" ON public.courts FOR SELECT USING (true);
CREATE POLICY "courts_admin_write" ON public.courts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Horarios: lectura pública
CREATE POLICY "schedules_read_all" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "schedules_admin_write" ON public.schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Reservas: cualquiera puede crear; solo dueño o admin puede ver/cancelar
CREATE POLICY "reservations_insert_all" ON public.reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "reservations_select_own_or_admin" ON public.reservations
  FOR SELECT USING (
    id_usuario = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "reservations_cancel_own_or_admin" ON public.reservations
  FOR UPDATE USING (
    id_usuario = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Pagos: solo admin
CREATE POLICY "payments_admin_only" ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Auditoría: solo admin
CREATE POLICY "audit_admin_only" ON public.audit_log FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));
