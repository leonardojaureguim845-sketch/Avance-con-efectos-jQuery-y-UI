/**
 * CANCHAPLUS — CLIENTE SUPABASE (PREPARACIÓN)
 * Se activa solo si SUPABASE_URL y SUPABASE_ANON_KEY están configuradas.
 * Por defecto la app usa el backend Node/SQLite.
 */
(function () {
  const url = (window.CANCHAPLUS_SUPABASE_URL || localStorage.getItem('canchaplus_supabase_url') || '').trim();
  const key = (window.CANCHAPLUS_SUPABASE_ANON_KEY || localStorage.getItem('canchaplus_supabase_anon_key') || '').trim();

  if (!url || !key || typeof window.supabase === 'undefined') {
    window.CanchaPlusSupabase = null;
    return;
  }

  try {
    window.CanchaPlusSupabase = window.supabase.createClient(url, key);
    console.info('CanchaPlus: Supabase client initialized.');
  } catch (err) {
    console.warn('CanchaPlus: Supabase init failed:', err.message);
    window.CanchaPlusSupabase = null;
  }
})();
