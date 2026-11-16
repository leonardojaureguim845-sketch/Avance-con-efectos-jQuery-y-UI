# DeporZone Arena — PWA

## Entradas
- `index.html`: versión de computadora.
- `mobile.html`: versión móvil; en PC aparece dentro de un marco de teléfono y en un celular ocupa toda la pantalla.

## Probar localmente
No abras los HTML con doble clic. En esta carpeta ejecuta:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000/index.html` o `http://localhost:8000/mobile.html`.

## Publicar en GitHub Pages
Sube el contenido de esta carpeta a la raíz del repositorio. En **Settings → Pages**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. GitHub Pages sirve por HTTPS y permite instalar la PWA.

La versión de computadora usa `manifest.json`; la móvil usa `mobile-manifest.json` para abrir directamente `mobile.html`. La disponibilidad y las reservas son demostrativas: no se procesa ningún pago ni se confirma una reserva real.

La vista móvil está optimizada para que Inicio, Reservas y Actividad quepan en una sola pantalla, sin desplazamiento vertical. En pantallas bajas se compactan más los espacios y controles.
