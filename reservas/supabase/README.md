# Supabase — Configuración para CanchaPlus

## 1. Crear proyecto
1. Ve a https://supabase.com y crea un proyecto.
2. Copia la **URL del proyecto** y la **anon (publishable) key**.

## 2. Ejecutar SQL
En el SQL Editor de Supabase, ejecuta en este orden:
1. `schema.sql`
2. `rls.sql`
3. `seed.sql`

## 3. Variables de entorno (frontend)
Agrega en tu `.env` o en la configuración de la app:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

## 4. Notas de seguridad
- La `service_role key` NUNCA debe ir en el frontend.
- Las operaciones privilegiadas (admin) deben hacerse con RLS o Edge Functions.
- La app actual sigue usando el backend Node/SQLite por defecto; para migrar a Supabase, reemplaza las llamadas en `js/api.js` por el cliente de Supabase (`@supabase/supabase-js`).

## 5. Cliente JS (opcional)
Carga el SDK desde CDN en `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```
Y en `js/supabase.js`:
```js
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
