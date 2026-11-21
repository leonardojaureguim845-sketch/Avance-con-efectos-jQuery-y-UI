# 🏆 CANCHAPLUS — RESERVAS DEPORTIVAS
### Diseño Web II · Universidad Privada Domingo Savio (UPDS) — Sede La Paz

**CanchaPlus** es una plataforma web progresiva (PWA) de nivel profesional para la exploración de disciplinas deportivas y la reserva de canchas en tiempo real en La Paz, Bolivia. Desarrollada siguiendo los más altos estándares de arquitectura web, diseño responsivo Mobile-First, accesibilidad (WCAG 2.1 AA), seguridad contra inyecciones XSS y persistencia estricta en una base de datos relacional SQLite con transacciones atómicas para prevenir condiciones de carrera y reservas duplicadas.

---

## 📋 Tabla de Contenidos

1. [Identidad y Características del Proyecto](#-identidad-y-características-del-proyecto)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Estructura de Archivos](#-estructura-de-archivos)
4. [Requisitos Previos](#-requisitos-previos)
5. [Instalación y Ejecución Local Rápida](#-instalación-y-ejecución-local-rápida)
6. [Base de Datos Relacional y Modelo de Datos](#-base-de-datos-relacional-y-modelo-de-datos)
7. [Documentación de la API REST](#-documentación-de-la-api-rest)
8. [Seguridad y Sanitización (DOMPurify & PBKDF2)](#-seguridad-y-sanitización)
9. [Diseño Responsivo (Mobile-First, Grid y Flexbox)](#-diseño-responsivo)
10. [Accesibilidad Web (A11y) y Auditoría Semántica](#-accesibilidad-web-a11y)
11. [PWA y Funcionamiento Offline (Service Worker)](#-pwa-y-funcionamiento-offline)
12. [Smoke Testing y Pruebas Automatizadas](#-smoke-testing-y-pruebas-automatizadas)
13. [Publicación en GitHub Pages](#-publicación-en-github-pages)

---

## 🎯 Identidad y Características del Proyecto

- **Nombre Oficial:** CANCHAPLUS — RESERVAS DEPORTIVAS.
- **Deportes Soportados Inicialmente:** Fútbol (Césped Sintético 5vs5 y Futsal), Wally (Canchas reglamentarias con paredes acolchadas) y Voleibol (Coliseo con piso de parquet amortiguado).
- **Paleta 60-30-10:**
  - **60% Dominante Neutro:** `#f8fafc` (claro) / `#0b1319` (oscuro).
  - **30% Secundario Estructural:** `#15803d` / `#14532d` (verde deportivo institucional y superficies de tarjeta).
  - **10% Acento Dinámico:** `#f59e0b` (oro trofeo) y `#22c55e` (verde lima brillante) para acciones y confirmaciones.
- **Modos de Visualización:** Modo Claro, Modo Oscuro (persistencia en `localStorage`), Alto Contraste y Simulación de Pantalla Móvil (`sim-movil`) para evaluación académica.

---

## 🏗️ Arquitectura del Sistema

El proyecto está diseñado bajo una estricta separación de responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                    CANCHAPLUS FRONTEND                      │
│   • HTML5 Semántico Único (index.html sin duplicados)      │
│   • CSS3 Modular (Variables, Layout, BEM, Responsive)       │
│   • JavaScript Modular + jQuery 3.7.1 + DOMPurify           │
│   • PWA: Service Worker (Shell v2) + manifest.json          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Fetch REST (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CANCHAPLUS BACKEND                       │
│   • Node.js REST API Server                                 │
│   • Enrutador modular con soporte CORS universal            │
│   • Middleware de autenticación y roles (Admin / Cliente)   │
│   • Validaciones de entrada (Nombres, Celular Bolivia)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Transacciones ACID (node:sqlite)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BASE DE DATOS RELACIONAL                     │
│   • SQLite 3 (canchaplus.sqlite)                            │
│   • Tablas: usuarios, deportes, canchas, horarios,          │
│             reservas, pagos, auditoria                      │
│   • Claves foráneas (PRAGMA foreign_keys = ON)              │
│   • Bloqueo inmediato para evitar doble reserva concurrente │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Estructura de Archivos

```
reservas/
├── index.html                   # Documento HTML5 responsivo único
├── manifest.json                # Manifiesto PWA oficial
├── service-worker.js            # Service Worker con caché de shell estático
├── README.md                    # Manual integral de instalación y operación
├── .gitignore                   # Exclusión de node_modules, .env y temporales
├── .env.example                 # Plantilla de variables de entorno
│
├── css/                         # Hojas de estilos modulares con BEM
│   ├── variables.css            # Paleta 60-30-10, temas y métricas
│   ├── base.css                 # Reset moderno y tipografía
│   ├── layout.css               # Header, contenedores, grillas y navegación
│   ├── components.css           # Tarjetas, botones, horarios, modales, toast
│   ├── responsive.css           # Media queries (móvil, horizontal, tablet, desktop)
│   └── accessibility.css        # Foco visible, contraste WCAG y screen readers
│
├── js/                          # Lógica frontend estructurada en submódulos
│   ├── app.js                   # Coordinador principal SPA y PWA
│   ├── api.js                   # Cliente HTTP REST configurable
│   ├── auth.js                  # Control de sesiones y usuario admin
│   ├── courts.js                # Renderizado dinámico de deportes y canchas
│   ├── reservations.js          # Calendario, disponibilidad real y validación
│   ├── components.js            # Modales, toast, simulador y acordeón
│   ├── accessibility.js         # Modo noche, alto contraste y auditoría A11y
│   └── smoke-test.js            # Verificador de integridad en navegador
│
├── assets/
│   ├── images/                  # Gráficos vectoriales SVG de canchas y deportes
│   └── icons/                   # Iconos PWA 192x192 y 512x512
│
├── vendor/                      # Dependencias cliente locales
│   ├── jquery-3.7.1.min.js      # jQuery oficial minificado
│   └── purify.min.js            # DOMPurify para sanitización XSS
│
└── backend/                     # Servidor Node.js y Base de Datos Relacional
    ├── package.json             # Manifiesto de scripts de Node.js
    ├── .env.example             # Configuración del servidor
    ├── seeds/
    │   └── init.js              # Script de inicialización y seeds maestros
    ├── tests/
    │   └── api.test.js          # Suite de pruebas automatizadas (node --test)
    └── src/
        ├── server.js            # Servidor HTTP y punto de entrada
        ├── app.js               # Enrutador REST, CORS y servidor estático
        ├── config/index.js      # Lectura de variables de entorno
        ├── database/
        │   ├── connection.js    # Conexión SQLite con WAL y transacciones
        │   └── schema.js        # DDL completo con claves foráneas e índices
        ├── services/            # Servicios de negocio (Auth, Canchas, Reservas, Auditoría)
        ├── controllers/         # Handlers de petición y respuesta JSON
        ├── middleware/          # Autenticación JWT y control de roles
        └── validators/          # Validadores de teléfono Bolivia, fechas y nombres
```

---

## ⚙️ Requisitos Previos

- **Node.js**: Versión 18 o superior (probado y optimizado en Node.js v24 con `node:sqlite` nativo).
- **Navegador Web Moderno**: Chrome, Brave, Edge, Opera o Firefox.

---

## 🚀 Instalación y Ejecución Local Rápida

### 1. Inicializar la Base de Datos
Abre tu terminal en la carpeta del backend y ejecuta el script de inicialización:
```bash
cd backend
node seeds/init.js
```
*Salida esperada:*
```
🌱 Inicializando datos base en SQLite CanchaPlus...
  ✔ Deportes inicializados (Fútbol, Wally, Voleibol).
  ✔ Canchas inicializadas (5 canchas reales).
  ✔ Horarios maestros registrados (13 bloques de 08:00 a 23:00).
  ✔ Usuario Administrador creado: admin@canchaplus.bo
  ✔ Reserva de prueba creada para hoy.
🎉 Base de Datos inicializada con éxito.
```

### 2. Iniciar el Servidor Backend
Inicia el servidor REST:
```bash
node src/server.js
```
El servidor arrancará en: **`http://localhost:3000`**

### 3. Abrir la Aplicación
Dado que el servidor incluye servicio de archivos estáticos integrados, puedes abrir directamente en tu navegador:
👉 **`http://localhost:3000`**

O si prefieres utilizar **VS Code Live Server**, abre `reservas/index.html` con Live Server (por ejemplo en `http://127.0.0.1:5500`), el cual se comunicará automáticamente con la API en el puerto 3000.

---

## 🗄️ Base de Datos Relacional y Modelo de Datos

La base de datos SQLite almacena de forma persistente y segura las siguientes tablas:

1. **`usuarios`**: Clientes y administradores (`id_usuario`, `nombre`, `apellido`, `telefono`, `correo`, `password_hash`, `rol`, `estado`, `fecha_creacion`).
2. **`deportes`**: Disciplinas disponibles (`id_deporte`, `codigo`, `nombre`, `descripcion`, `icono`, `estado`).
3. **`canchas`**: Campos deportivos con precio por hora y fotos (`id_cancha`, `id_deporte`, `nombre`, `descripcion`, `precio_hora`, `ubicacion`, `foto_url`, `estado`).
4. **`horarios`**: Bloques horarios maestros de 08:00 a 23:00 (`id_horario`, `hora_inicio`, `hora_fin`, `estado`).
5. **`reservas`**: Registro transaccional de reservas (`id_reserva`, `codigo_reserva`, `id_usuario`, `nombre_cliente`, `telefono_cliente`, `correo_cliente`, `id_cancha`, `id_horario`, `hora_inicio`, `fecha_reserva`, `cantidad_horas`, `precio_total`, `estado`, `fecha_creacion`).
6. **`pagos`**: Registro de control presencial en cancha (`id_pago`, `id_reserva`, `monto`, `metodo`, `estado`, `fecha_pago`).
7. **`auditoria`**: Bitácora inmutable de eventos (`id_auditoria`, `tabla`, `registro`, `accion`, `usuario`, `fecha_hora`, `ip`, `detalles`).

### Prevención de Dobles Reservas (Transacciones Atómicas)
La disponibilidad no es simulada. La creación de una reserva se ejecuta dentro de `db.exec('BEGIN IMMEDIATE')`:
- El servidor verifica si algún intervalo solicitado coincide con una reserva confirmada existente para esa cancha y fecha.
- Si existe solapamiento, la transacción aborta con `ROLLBACK` y responde `HTTP 400` con el detalle del conflicto.
- Solo si el horario está 100% libre, se guarda la reserva, se crea el pago pendiente en cancha, se registra el evento en auditoría y se ejecuta `COMMIT`.

---

## 🌐 Documentación de la API REST

| Método | Endpoint | Descripción | Acceso |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servicio y timestamp | Público |
| `GET` | `/api/deportes` | Lista de disciplinas deportivas activas | Público |
| `GET` | `/api/canchas` | Catálogo de canchas (filtro opcional `?deporte=futbol`) | Público |
| `GET` | `/api/canchas/:id` | Detalle específico de una cancha | Público |
| `GET` | `/api/disponibilidad` | Horarios libres y ocupados reales (`?cancha_id=1&fecha=AAAA-MM-DD`) | Público |
| `POST` | `/api/reservas` | Registra reserva con transacción segura | Público / Auth |
| `GET` | `/api/reservas/:id` | Consulta de reserva por ID numérico o código (`CP-2026-XXXX`) | Público |
| `GET` | `/api/mis-reservas` | Consulta por celular o correo (`?telefono=70000000`) | Público / Auth |
| `PATCH` | `/api/reservas/:id/cancelar` | Cancela una reserva y libera el horario | Cliente / Admin |
| `POST` | `/api/auth/login` | Inicio de sesión (retorna token HMAC SHA-256) | Público |
| `POST` | `/api/auth/registro` | Registro de nuevos usuarios con hash seguro | Público |
| `GET` | `/api/reservas` | Listado completo de reservas | Administrador |
| `GET` | `/api/auditoria` | Registros de auditoría de base de datos | Administrador |

---

## 🔒 Seguridad y Sanitización

- **Contraseñas Seguras:** Hasheadas criptográficamente mediante algoritmo PBKDF2 con sal aleatoria de 16 bytes y 100,000 iteraciones SHA-512. No se guardan claves en texto plano.
- **Consultas Parametrizadas:** 100% de las consultas SQL utilizan sentencias preparadas (`db.prepare(...)`) con marcadores `?`, erradicando cualquier vector de inyección SQL.
- **Prevención XSS:** Todo el contenido dinámico renderizado en el DOM es sanitizado mediante **DOMPurify** antes de su inserción, o manejado directamente como texto mediante `.text()`.
- **Validación Estricta Bolivia:**
  - Teléfonos móviles validados mediante expresión regular boliviana: 8 dígitos iniciando obligatoriamente con `6` o `7`, con o sin prefijo `+591`.
  - Fechas validadas en formato ISO `AAAA-MM-DD`, prohibiendo reservas en fechas pasadas.
  - Validación de nombres con longitud mínima y separación de nombre y apellido.

---

## 📱 Diseño Responsivo

Un solo archivo `index.html` adaptable automáticamente a:
- **Celular Vertical (360x800 / 390x844):** Barra inferior fija (Bottom Navigation), botones grandes táctiles (mínimo 44px), grilla de una columna, inputs cómodos sin desplazamiento horizontal.
- **Celular Horizontal (Landscape):** Cabecera compacta optimizada, panel de horarios distribuido horizontalmente para no obstruir la visibilidad.
- **Tablet (768x1024):** Grilla de 2 columnas, cabecera con navegación superior y botón de tema visible.
- **Escritorio (>1024px):** Layout amplio en 2 columnas (horarios a la izquierda, resumen y formulario a la derecha), con espacios optimizados y efectos visuales discretos.
- **Simulador Móvil (`sim-movil`):** Botón en cabecera para encuadrar la aplicación en dimensiones móviles para fines de demostración académica.

---

## ♿ Accesibilidad Web (A11y)

- Cumplimiento de pautas **WCAG 2.1 Nivel AA**.
- Estructura HTML5 semántica completa: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- Enlace accesible para saltar al contenido principal (`.c-skip-link`).
- Etiquetas `<label>` asociadas explícitamente a cada `<input>`.
- Textos alternativos descriptivos en todas las imágenes (`alt`).
- Indicadores visuales de foco estrictos (`:focus-visible`) con contorno verde de 3px y contraste garantizado.
- Botón de **Modo de Alto Contraste** (`high-contrast`) para personas con baja visión.
- Regiones dinámicas con `aria-live="polite"` para anuncios de disponibilidad y auditoría.
- Herramienta de **Auditoría Semántica en Vivo** integrada en la pestaña de Actividad.

---

## 📶 PWA y Funcionamiento Offline

- **Manifiesto:** `manifest.json` con `display: standalone`, colores de tema institucionales e iconos en resoluciones `192x192` y `512x512`.
- **Service Worker (`service-worker.js`):**
  - Cachea el App Shell estático (HTML, CSS, JS, imágenes SVG, iconos y librerías).
  - Intercepta peticiones GET para servir la interfaz instantáneamente incluso sin internet.
  - En caso de desconexión, muestra datos en caché e informa con claridad que **las reservas requieren conexión con el servidor**. No simula reservas ficticias offline.

---

## 🧪 Smoke Testing y Pruebas Automatizadas

### Pruebas Automatizadas del Backend
Ejecuta la suite oficial con el ejecutor nativo de Node.js:
```bash
cd backend
npm test
```
*Resultado:*
```
✔ 1. Validadores de entrada (celulares bolivianos, fechas no pasadas, nombres)
✔ 2. Endpoints Públicos de Consulta (health, deportes, canchas, disponibilidad real)
✔ 3. Transacciones y Prevención de Reservas Duplicadas (creación, bloqueo de conflicto, cancelación y re-reserva)
✔ 4. Autenticación y Seguridad (login con hash seguro, endpoints admin protegidos, auditoría)
ℹ tests 18 pass, 0 fail (100% de éxito)
```

### Panel de Smoke Testing en la Interfaz
En la pestaña **"Actividad"**, pulsa el botón **"🚀 Ejecutar Smoke Tests"** para verificar en tiempo real:
- Disponibilidad de jQuery 3.7.1 y DOMPurify.
- Conectividad activa contra `/api/health`.
- Registro correcto del Service Worker.
- Consulta en vivo a la tabla de deportes y canchas de la base de datos SQLite.

---

## 🚀 Publicación en GitHub Pages

1. El frontend está estructurado con rutas relativas (`./css/`, `./js/`, `./vendor/`, `./icons/`) para funcionar sin romperse dentro del subdirectorio:
   `https://<usuario>.github.io/<repositorio>/reservas/`
2. **Despliegue del Backend:** Despliega la carpeta `backend/` en cualquier servicio gratuito o de tu preferencia (ej. Render, Railway, Fly.io o tu propio VPS con Node.js).
3. **Conexión Frontend - Backend:**
   En la aplicación web, pulsa el botón **"⚙️ Conexión API"** en la parte superior e introduce la URL pública de tu backend (por ejemplo: `https://mi-canchaplus-api.onrender.com/api`). La URL se guardará en tu navegador y CanchaPlus se conectará de inmediato a tu base de datos en la nube.

---

**CanchaPlus · Universidad Privada Domingo Savio — Sede La Paz · 2026**
