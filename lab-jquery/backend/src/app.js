/**
 * Dispatcher HTTP / Router API REST para CanchaPlus
 * Funciona nativamente con node:http sin dependencias externas
 */
const { URL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const controllers = require('./controllers');
const { optionalAuth, requireAdmin } = require('./middleware/authMiddleware');

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler, middlewares = []) {
    // Convierte /api/canchas/:id a una expresión regular
    const paramNames = [];
    const regexPath = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPath}$`);

    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      regex,
      paramNames,
      handler,
      middlewares
    });
  }

  get(pattern, handler, ...middlewares) {
    this.add('GET', pattern, handler, middlewares);
  }

  post(pattern, handler, ...middlewares) {
    this.add('POST', pattern, handler, middlewares);
  }

  patch(pattern, handler, ...middlewares) {
    this.add('PATCH', pattern, handler, middlewares);
  }

  delete(pattern, handler, ...middlewares) {
    this.add('DELETE', pattern, handler, middlewares);
  }

  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method.toUpperCase()) continue;
      const match = pathname.match(r.regex);
      if (match) {
        const params = {};
        r.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { ...r, params };
      }
    }
    return null;
  }
}

const router = new Router();

// Rutas Públicas
router.get('/api/health', controllers.health);
router.get('/api/deportes', controllers.getDeportes);
router.get('/api/canchas', controllers.getCanchas);
router.get('/api/canchas/:id', controllers.getCanchaById);
router.get('/api/horarios', controllers.getHorarios);
router.get('/api/disponibilidad', controllers.getDisponibilidad);
router.get('/api/reservas/:id', controllers.getReserva);
router.post('/api/reservas', controllers.createReserva, optionalAuth);
router.patch('/api/reservas/:id/cancelar', controllers.cancelarReserva, optionalAuth);
router.get('/api/mis-reservas', controllers.getMisReservas, optionalAuth);
router.get('/api/usuarios/:id/reservas', controllers.getMisReservas, optionalAuth);

// Rutas de Autenticación
router.post('/api/auth/registro', controllers.registro);
router.post('/api/auth/login', controllers.login);
router.post('/api/auth/logout', controllers.logout);
router.get('/api/auth/perfil', controllers.perfil, optionalAuth);

// Rutas Administrativas
router.get('/api/reservas', controllers.getAllReservas, requireAdmin);
router.get('/api/auditoria', controllers.getAuditoria, requireAdmin);
router.post('/api/admin/canchas', controllers.createCancha, requireAdmin);
router.patch('/api/admin/canchas/:id', controllers.updateCancha, requireAdmin);

// Gestor de peticiones principal
function handleRequest(req, res) {
  // CORS Headers universales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parsear URL y Query
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const query = {};
  parsedUrl.searchParams.forEach((val, key) => { query[key] = val; });
  req.query = query;
  req.clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Buscar coincidencia en API
  const matchedRoute = router.match(req.method, pathname);

  if (matchedRoute) {
    req.params = matchedRoute.params;

    // Leer cuerpo si es POST o PATCH
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      let bodyData = '';
      req.on('data', chunk => {
        bodyData += chunk;
        if (bodyData.length > 1e6) { // Limite 1MB
          req.socket.destroy();
        }
      });

      req.on('end', () => {
        if (bodyData.trim()) {
          try {
            req.body = JSON.parse(bodyData);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: false, error: 'Cuerpo de solicitud JSON inválido.' }));
          }
        } else {
          req.body = {};
        }

        // Ejecutar middlewares y handler
        executeHandler(matchedRoute, req, res);
      });
      return;
    } else {
      req.body = {};
      return executeHandler(matchedRoute, req, res);
    }
  }

  // Si no coincide con ninguna ruta API y solicita /api/* -> 404 JSON
  if (pathname.startsWith('/api')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: `Ruta API no encontrada: ${req.method} ${pathname}` }));
    return;
  }

  // Servir frontend estático si la petición no es API (para correr todo desde el mismo puerto)
  serveStatic(pathname, res);
}

function executeHandler(route, req, res) {
  const chain = [...route.middlewares];
  
  function next() {
    if (chain.length > 0) {
      const mw = chain.shift();
      mw(req, res, next);
    } else {
      route.handler(req, res);
    }
  }
  next();
}

function serveStatic(pathname, res) {
  const rootDir = path.resolve(__dirname, '../../');
  let filePath = path.join(rootDir, pathname === '/' ? 'index.html' : pathname);

  // Prevenir path traversal
  if (!filePath.startsWith(rootDir)) {
    res.statusCode = 403;
    return res.end('Acceso denegado');
  }

  // Si no existe, servir index.html (SPA fallback)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(rootDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Archivo no encontrado');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(content);
  });
}

module.exports = { handleRequest, router };
