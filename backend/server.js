require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin.match(/^http:\/\/192\.168\.\d+\.\d+/) || origin.match(/^http:\/\/10\.\d+\.\d+\.\d+/) || origin.match(/^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'gers.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) { fs.mkdirSync(dbDir, { recursive: true }); }
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('Conectado a SQLite en', dbPath);
});

const PBKDF2_ITERATIONS = 120000;
const SESSION_DAYS = 30;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function actorFromReq(req) {
  return req.user?.nombre || req.user?.username || 'Sistema';
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getUserByToken(token) {
  return getQuery(
    `SELECT u.id, u.username, u.nombre, u.rol
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.revoked = 0 AND s.expires_at > CURRENT_TIMESTAMP`,
    [token]
  );
}

async function refreshSession(token) {
  await runQuery(`UPDATE sessions SET expires_at = datetime('now', '+${SESSION_DAYS} days') WHERE token = ? AND revoked = 0`, [token]);
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    await refreshSession(token);
    req.user = user;
    req.authToken = token;
    next();
  } catch (err) {
    console.error('Error de autenticación:', err);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

async function ensureDefaultAdmin() {
  try {
    const user = await getQuery('SELECT COUNT(*) as total FROM users');
    if (user && user.total > 0) return;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Administrador';
    const { salt, hash } = hashPassword(adminPass);
    await runQuery(
      'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [adminUser, hash, salt, name, 'admin']
    );
    console.log(`Usuario admin inicial creado: ${adminUser}`);
  } catch (err) {
    console.error('No se pudo crear el usuario admin inicial:', err);
  }
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    origen TEXT,
    destino TEXT,
    conductor TEXT,
    telefono TEXT,
    remolque TEXT,
    estado TEXT DEFAULT 'programado',
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE viajes ADD COLUMN telefono TEXT", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN remolque TEXT", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    tipo TEXT,
    mensaje TEXT,
    severidad TEXT DEFAULT 'info',
    leida INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    prioridad TEXT DEFAULT 'media',
    estado TEXT DEFAULT 'pendiente',
    asignado_a TEXT,
    turno TEXT,
    notas TEXT,
    creado_por TEXT,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comentarios_pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pendiente_id INTEGER NOT NULL,
    autor TEXT,
    contenido TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pendiente_id) REFERENCES pendientes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pendientes_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pendiente_id INTEGER,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    prioridad TEXT,
    estado TEXT,
    asignado_a TEXT,
    turno TEXT,
    notas TEXT,
    creado_por TEXT,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    fecha_creacion DATETIME,
    fecha_actualizacion DATETIME,
    archived_by_user_id INTEGER,
    archived_by_username TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT,
    autor TEXT DEFAULT 'Sistema',
    tipo TEXT DEFAULT 'seguimiento',
    titulo TEXT,
    contenido TEXT NOT NULL,
    kilometraje REAL,
    estatus TEXT DEFAULT '',
    remolque TEXT DEFAULT '',
    grupo TEXT DEFAULT '',
    origen TEXT DEFAULT '',
    destino TEXT DEFAULT '',
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vehicle_locations (
    vehicle_id TEXT PRIMARY KEY,
    vehicle_name TEXT,
    latitude REAL,
    longitude REAL,
    speed REAL,
    location TEXT,
    time_ms INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vehicle_operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT UNIQUE NOT NULL,
    vehicle_name TEXT,
    operator_name TEXT,
    telefono TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE vehicle_operators ADD COLUMN telefono TEXT", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS geofences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    latitud REAL NOT NULL,
    longitud REAL NOT NULL,
    radio_metros REAL DEFAULT 500,
    descripcion TEXT,
    color TEXT DEFAULT '#3b82f6',
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS geofence_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT,
    geofence_id INTEGER,
    geofence_nombre TEXT,
    tipo TEXT NOT NULL,
    latitud REAL,
    longitud REAL,
    source TEXT DEFAULT 'local',
    event_uid TEXT,
    raw_payload TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE geofence_events ADD COLUMN source TEXT DEFAULT 'local'", [], () => {});
  db.run("ALTER TABLE geofence_events ADD COLUMN event_uid TEXT", [], () => {});
  db.run("ALTER TABLE geofence_events ADD COLUMN raw_payload TEXT DEFAULT ''", [], () => {});
  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_geofence_events_event_uid ON geofence_events(event_uid) WHERE event_uid IS NOT NULL", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS vehicle_geofence_state (
    vehicle_id TEXT NOT NULL,
    geofence_id INTEGER NOT NULL,
    inside INTEGER DEFAULT 0,
    last_check DATETIME,
    PRIMARY KEY (vehicle_id, geofence_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS route_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT,
    latitude REAL,
    longitude REAL,
    speed REAL,
    heading REAL,
    location TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    nombre TEXT,
    rol TEXT DEFAULT 'user',
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS turnos_reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno TEXT,
    horas INTEGER DEFAULT 8,
    observaciones TEXT DEFAULT '',
    resumen_json TEXT NOT NULL,
    resumen_texto TEXT NOT NULL,
    created_by INTEGER,
    created_by_username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_route_history_vehicle_time ON route_history (vehicle_id, recorded_at)`);

  db.run("ALTER TABLE geofences ADD COLUMN categoria TEXT DEFAULT 'custom'", [], () => {});

  db.run("ALTER TABLE comentarios ADD COLUMN estatus TEXT DEFAULT ''", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN remolque TEXT DEFAULT ''", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN grupo TEXT DEFAULT ''", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN origen TEXT DEFAULT ''", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN destino TEXT DEFAULT ''", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN created_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE comentarios ADD COLUMN created_by_username TEXT", [], () => {});
  db.run("ALTER TABLE pendientes ADD COLUMN created_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE pendientes ADD COLUMN created_by_username TEXT", [], () => {});
  db.run("ALTER TABLE comentarios_pendientes ADD COLUMN created_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE comentarios_pendientes ADD COLUMN created_by_username TEXT", [], () => {});
  db.run("ALTER TABLE seguimiento ADD COLUMN created_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE seguimiento ADD COLUMN created_by_username TEXT", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS remolques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    categoria TEXT DEFAULT 'Caja Seca',
    status TEXT DEFAULT 'disponible',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE remolques ADD COLUMN categoria TEXT DEFAULT 'Caja Seca'", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS remolque_asignaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remolque_id INTEGER NOT NULL,
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS seguimiento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unidad TEXT NOT NULL,
    operador TEXT DEFAULT '',
    remolque TEXT DEFAULT '',
    ruta TEXT DEFAULT '',
    origen TEXT DEFAULT '',
    destino TEXT DEFAULT '',
    cita_carga TEXT DEFAULT '',
    cita_descarga TEXT DEFAULT '',
    hora_llegada TEXT DEFAULT '',
    hora_liberacion TEXT DEFAULT '',
    estatus TEXT DEFAULT 'Disponible',
    comentarios_cliente TEXT DEFAULT '',
    comentarios_monitoreo TEXT DEFAULT '',
    grupo TEXT DEFAULT '',
    created_by_user_id INTEGER,
    created_by_username TEXT,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS seguimiento_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seguimiento_id INTEGER NOT NULL,
    campo TEXT NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario TEXT DEFAULT 'Sistema',
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    estatus TEXT DEFAULT 'Activa',
    notas TEXT DEFAULT '',
    tipo TEXT DEFAULT 'manual',
    samsara_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS risk_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'high',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius INTEGER DEFAULT 5000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const catalogGeofences = [
    { nombre: 'GERS Planta Principal', latitud: 25.7894, longitud: -100.1824, radio_metros: 1000, descripcion: 'Planta principal GERS Monterrey', color: '#10b981', categoria: 'planta' },
    { nombre: 'GERS Centro de Distribución', latitud: 25.7234, longitud: -100.3140, radio_metros: 800, descripcion: 'Centro de distribución zona metropolitana', color: '#10b981', categoria: 'planta' },
    { nombre: 'Monterrey - Zona Industrial', latitud: 25.6866, longitud: -100.3161, radio_metros: 5000, descripcion: 'Zona industrial Valle de Santiago', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Guadalajara - Zona Logística', latitud: 20.6597, longitud: -103.3496, radio_metros: 5000, descripcion: 'Zona logística poniente', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'CDMX - Zona Industrial Vallejo', latitud: 19.5050, longitud: -99.1230, radio_metros: 4000, descripcion: 'Zona industrial Vallejo', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Querétaro - Zona Industrial', latitud: 20.5888, longitud: -100.3899, radio_metros: 4000, descripcion: 'Zona industrial El Marques', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Aguascalientes - Zona Industrial', latitud: 21.8853, longitud: -102.2916, radio_metros: 4000, descripcion: 'Zona industrial oriente', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'León - Zona Industrial', latitud: 21.1236, longitud: -101.6821, radio_metros: 3500, descripcion: 'Zona industrial León este', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Puebla - Zona Industrial', latitud: 19.0514, longitud: -98.2153, radio_metros: 3500, descripcion: 'Zona industrial Chore', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Ciudad Juárez - Zona Industrial', latitud: 31.6904, longitud: -106.4245, radio_metros: 4000, descripcion: 'Zona industrial fronteriza', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Tijuana - Zona Industrial', latitud: 32.5149, longitud: -116.9983, radio_metros: 3500, descripcion: 'Zona industrial Tijuana', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Mérida - Zona Industrial', latitud: 20.9674, longitud: -89.5926, radio_metros: 3000, descripcion: 'Zona industrial Mérida norte', color: '#3b82f6', categoria: 'logistica' },
    { nombre: 'Puerto de Veracruz', latitud: 19.1958, longitud: -96.1350, radio_metros: 3000, descripcion: 'Puerto marítimo de Veracruz', color: '#f59e0b', categoria: 'puerto' },
    { nombre: 'Puerto de Manzanillo', latitud: 19.0513, longitud: -104.3188, radio_metros: 3000, descripcion: 'Puerto marítimo de Manzanillo, Colima', color: '#f59e0b', categoria: 'puerto' },
    { nombre: 'Puerto de Lázaro Cárdenas', latitud: 17.9553, longitud: -102.1847, radio_metros: 3000, descripcion: 'Puerto marítimo de Lázaro Cárdenas', color: '#f59e0b', categoria: 'puerto' },
    { nombre: 'Puerto de Altamira', latitud: 22.3844, longitud: -97.9216, radio_metros: 2500, descripcion: 'Puerto industrial de Altamira, Tamps', color: '#f59e0b', categoria: 'puerto' },
    { nombre: 'Puerto de Coatzacoalcos', latitud: 18.1493, longitud: -94.4242, radio_metros: 2500, descripcion: 'Puerto de Coatzacoalcos, Ver', color: '#f59e0b', categoria: 'puerto' },
    { nombre: 'Aduana Nuevo Laredo', latitud: 27.4722, longitud: -99.5117, radio_metros: 1500, descripcion: 'Aduana fronteriza Nuevo Laredo, Tamps', color: '#ef4444', categoria: 'aduana' },
    { nombre: 'Aduana Ciudad Juárez', latitud: 31.7431, longitud: -106.4304, radio_metros: 1500, descripcion: 'Aduana fronteriza Cd. Juárez, Chih', color: '#ef4444', categoria: 'aduana' },
    { nombre: 'Aduana Tijuana', latitud: 32.5431, longitud: -117.0291, radio_metros: 1500, descripcion: 'Aduana fronteriza Tijuana, BC', color: '#ef4444', categoria: 'aduana' },
    { nombre: 'Aduana Mexicali', latitud: 32.6312, longitud: -115.4360, radio_metros: 1500, descripcion: 'Aduana fronteriza Mexicali, BC', color: '#ef4444', categoria: 'aduana' },
    { nombre: 'Aduana Reynosa', latitud: 26.0927, longitud: -98.2778, radio_metros: 1500, descripcion: 'Aduana fronteriza Reynosa, Tamps', color: '#ef4444', categoria: 'aduana' },
    { nombre: 'Aduana Nogales', latitud: 31.3265, longitud: -110.9408, radio_metros: 1500, descripcion: 'Aduana fronteriza Nogales, Son', color: '#ef4444', categoria: 'aduana' },
  ];

  db.get('SELECT COUNT(*) as count FROM geofences', [], (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)');
      catalogGeofences.forEach(g => {
        stmt.run(g.nombre, g.latitud, g.longitud, g.radio_metros, g.descripcion, g.color, g.categoria);
      });
      stmt.finalize();
      console.log(`Seeded ${catalogGeofences.length} geocercas del catálogo`);
    } else {
      db.all('SELECT nombre FROM geofences', [], (e, existing) => {
        const existingNames = new Set((existing || []).map(r => r.nombre));
        const missing = catalogGeofences.filter(g => !existingNames.has(g.nombre));
        if (missing.length > 0) {
          const stmt = db.prepare('INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)');
          missing.forEach(g => {
            stmt.run(g.nombre, g.latitud, g.longitud, g.radio_metros, g.descripcion, g.color, g.categoria);
          });
          stmt.finalize();
          console.log(`Seeded ${missing.length} geocercas faltantes del catálogo`);
        }
      });
    }
  });
});

ensureDefaultAdmin();

const samsaraApi = axios.create({
  baseURL: 'https://api.samsara.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = await getQuery('SELECT * FROM users WHERE username = ? AND activo = 1', [username.trim()]);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    await runQuery(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`, [user.id, token]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
      },
      expiresAt,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await runQuery('UPDATE sessions SET revoked = 1 WHERE token = ?', [req.authToken]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    res.json(users);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, nombre = '', rol = 'user' } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }
    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) return res.status(409).json({ error: 'El usuario ya existe' });
    const { salt, hash } = hashPassword(password);
    const result = await runQuery(
      'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [username.trim(), hash, salt, nombre.trim(), rol]
    );
    const user = await getQuery('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(user);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

function buildTurnoText(summary) {
  const lines = [];
  lines.push(`REPORTE DE ENTREGA DE TURNO`);
  lines.push(`Periodo: ultimas ${summary.horas} horas`);
  lines.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
  if (summary.turno) lines.push(`Turno: ${summary.turno}`);
  if (summary.observaciones) lines.push(`Observaciones: ${summary.observaciones}`);
  lines.push('');
  lines.push('RESUMEN');
  lines.push(`- Alertas no leidas: ${summary.alertasNoLeidas}`);
  lines.push(`- Alertas de combustible bajo: ${summary.alertasCombustibleBajo}`);
  lines.push(`- Pendientes que quedan: ${summary.pendientesQueQuedanTotal}`);
  lines.push(`- Pendientes resueltos en turno: ${summary.pendientesResueltosTotal}`);
  lines.push(`- Viajes activos: ${summary.viajesActivos}`);
  lines.push(`- Eventos de geocerca: ${summary.eventosGeocerca}`);
  lines.push(`- Unidades con ubicacion registrada: ${summary.unidadesConUbicacion}`);
  lines.push('');
  lines.push('LO MAS RELEVANTE');
  if (summary.alertasCriticas.length === 0 && summary.eventosRecientes.length === 0 && summary.pendientesQueQuedan.length === 0 && summary.pendientesResueltos.length === 0) {
    lines.push('- No se detectaron eventos criticos relevantes en el periodo.');
  } else {
    summary.alertasCriticas.forEach(a => lines.push(`- Alerta: ${a.vehicle_name || a.vehicle_id} | ${a.tipo} | ${a.mensaje}`));
    summary.eventosRecientes.forEach(e => lines.push(`- Geocerca: ${e.vehicle_name || e.vehicle_id} | ${e.geofence_nombre} | ${e.tipo} | ${e.created_at}`));
    if (summary.pendientesResueltos.length) {
      lines.push('Pendientes resueltos:');
      summary.pendientesResueltos.forEach(p => lines.push(`- ${p.titulo} | ${p.prioridad} | ${p.fecha_actualizacion || p.fecha_creacion}`));
    }
    if (summary.pendientesQueQuedan.length) {
      lines.push('Pendientes que se quedan:');
      summary.pendientesQueQuedan.forEach(p => lines.push(`- ${p.titulo} | ${p.prioridad} | ${p.estado} | ${p.asignado_a || 'Sin asignar'}`));
    }
  }
  return lines.join('\n');
}

async function getTurnoSummary(hours = 8, turno = '', observaciones = '') {
  const safeHours = Math.max(1, Math.min(Number(hours) || 8, 72));
  const periodStart = `datetime('now', '-${safeHours} hours')`;

  const [alertasNoLeidas, alertasCombustibleBajo, pendientesQueQuedanTotal, pendientesResueltosTotal, viajesActivos, eventosGeocerca, eventosRecientes, alertasCriticas, pendientesQueQuedan, pendientesResueltos, unidadesConUbicacion] = await Promise.all([
    getQuery('SELECT COUNT(*) as total FROM alertas WHERE leida = 0'),
    getQuery(`SELECT COUNT(*) as total FROM alertas WHERE tipo = 'combustible_bajo' AND timestamp >= ${periodStart}`),
    getQuery("SELECT COUNT(*) as total FROM pendientes WHERE estado != 'completado'"),
    getQuery(`SELECT COUNT(*) as total FROM pendientes WHERE estado = 'completado' AND fecha_actualizacion >= ${periodStart}`),
    getQuery("SELECT COUNT(*) as total FROM viajes WHERE estado NOT IN ('completado', 'cancelado')"),
    getQuery(`SELECT COUNT(*) as total FROM geofence_events WHERE created_at >= ${periodStart}`),
    allQuery(`SELECT * FROM geofence_events WHERE created_at >= ${periodStart} ORDER BY created_at DESC LIMIT 5`),
    allQuery(`SELECT * FROM alertas WHERE (severidad IN ('critica', 'alta') OR tipo = 'combustible_bajo') AND timestamp >= ${periodStart} ORDER BY timestamp DESC LIMIT 5`),
    allQuery(`SELECT * FROM pendientes WHERE estado != 'completado' ORDER BY CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 ELSE 4 END, fecha_creacion DESC LIMIT 8`),
    allQuery(`SELECT * FROM pendientes WHERE estado = 'completado' AND fecha_actualizacion >= ${periodStart} ORDER BY fecha_actualizacion DESC LIMIT 8`),
    getQuery('SELECT COUNT(*) as total FROM vehicle_locations'),
  ]);

  const summary = {
    horas: safeHours,
    turno,
    observaciones,
    alertasNoLeidas: alertasNoLeidas?.total || 0,
    alertasCombustibleBajo: alertasCombustibleBajo?.total || 0,
    pendientesQueQuedanTotal: pendientesQueQuedanTotal?.total || 0,
    pendientesResueltosTotal: pendientesResueltosTotal?.total || 0,
    viajesActivos: viajesActivos?.total || 0,
    eventosGeocerca: eventosGeocerca?.total || 0,
    eventosRecientes,
    alertasCriticas,
    pendientesQueQuedan,
    pendientesResueltos,
    unidadesConUbicacion: unidadesConUbicacion?.total || 0,
  };

  summary.texto = buildTurnoText(summary);
  return summary;
}

app.post('/api/turnos/entregar', async (req, res) => {
  try {
    const { horas = 8, turno = '', observaciones = '' } = req.body || {};
    const summary = await getTurnoSummary(horas, turno, observaciones);
    const saved = await runQuery(
      `INSERT INTO turnos_reportes (turno, horas, observaciones, resumen_json, resumen_texto, created_by, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        turno || '',
        summary.horas,
        observaciones || '',
        JSON.stringify(summary),
        summary.texto,
        req.user?.id || null,
        req.user?.username || '',
      ]
    );
    const report = await getQuery('SELECT * FROM turnos_reportes WHERE id = ?', [saved.lastID]);
    res.json({ summary, report });
  } catch (err) {
    console.error('Error al generar entrega de turno:', err);
    res.status(500).json({ error: 'Error al generar entrega de turno' });
  }
});

app.post('/api/turnos/resumen', async (req, res) => {
  try {
    const { horas = 8, turno = '', observaciones = '' } = req.body || {};
    const summary = await getTurnoSummary(horas, turno, observaciones);
    res.json({ summary });
  } catch (err) {
    console.error('Error al generar resumen de turno:', err);
    res.status(500).json({ error: 'Error al generar resumen de turno' });
  }
});

app.get('/api/turnos/entregas', async (req, res) => {
  try {
    const reports = await allQuery('SELECT * FROM turnos_reportes ORDER BY created_at DESC LIMIT 50');
    res.json(reports);
  } catch (err) {
    console.error('Error al consultar reportes de turno:', err);
    res.status(500).json({ error: 'Error al consultar reportes de turno' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  return requireAuth(req, res, next);
});

// ============ SAMSARA VEHICLES + LOCATIONS ============

app.get('/api/samsara/vehicles', async (req, res) => {
  try {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    let locationsMap = {};
    try {
      const locRes = await axios.get('https://api.samsara.com/fleet/vehicles/locations', {
        headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' }
      });

      for (const v of (locRes.data?.data || [])) {
        if (v.location) {
          const now = Date.now();
          const locTime = new Date(v.location.time).getTime();
          const timeDiff = now - locTime;
          locationsMap[v.id] = {
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            speed: v.location.speed,
            location: v.location.reverseGeo?.formattedLocation || '',
            timeMs: locTime,
            minutesAgo: Math.round(timeDiff / 60000)
          };

          db.run(
            `INSERT OR REPLACE INTO vehicle_locations (vehicle_id, vehicle_name, latitude, longitude, speed, location, time_ms, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [v.id, v.name || null, v.location.latitude, v.location.longitude, v.location.speed, v.location.reverseGeo?.formattedLocation || '', locTime],
            () => {}
          );

          db.run(
            `INSERT INTO route_history (vehicle_id, vehicle_name, latitude, longitude, speed, heading, location) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [v.id, v.name || null, v.location.latitude, v.location.longitude, v.location.speed, v.location.heading, v.location.reverseGeo?.formattedLocation || ''],
            () => {}
          );
        }
      }
    } catch (locErr) {
      console.error('Error fetching locations:', locErr.message);
    }

    const enrichedVehicles = vehicles.map(v => {
      const apiLoc = locationsMap[v.id];

      return {
        ...v,
        location: apiLoc || null,
        isOnline: !!apiLoc,
        hasLocation: !!apiLoc,
        lastSeen: apiLoc ? apiLoc.minutesAgo : null
      };
    });

    res.json(enrichedVehicles);
  } catch (error) {
    console.error('Error Samsara API:', error.message);
    res.status(500).json({ error: 'Error al obtener vehículos', details: error.message });
  }
});

// ============ OPERATORS ============

app.get('/api/vehicle-operators', (req, res) => {
  db.all('SELECT * FROM vehicle_operators', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/vehicle-operators/:vehicleId', (req, res) => {
  const { operator_name, telefono } = req.body;
  db.run(
    `INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, telefono, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(vehicle_id) DO UPDATE SET operator_name = ?, telefono = ?, updated_at = datetime('now')`,
    [req.params.vehicleId, req.body.vehicle_name || null, operator_name || '', telefono || '', operator_name || '', telefono || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// ============ SAMSARA DRIVERS ============

app.get('/api/samsara/drivers', async (req, res) => {
  try {
    let allDrivers = [];
    let after = null;

    do {
      const params = after ? { after } : {};
      const driversRes = await axios.get('https://api.samsara.com/fleet/drivers', {
        headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
        params
      });
      const batch = driversRes.data.data || [];
      allDrivers = allDrivers.concat(batch);
      after = driversRes.data.pagination?.endCursor || null;
    } while (after);

    res.json(allDrivers.map(d => ({
      id: d.id,
      name: d.name,
      username: d.username,
      phone: d.phone,
      status: d.driverActivationStatus,
      timezone: d.timezone,
      carrier: d.carrierSettings?.carrierName || ''
    })));
  } catch (error) {
    console.error('Error fetching drivers:', error.message);
    res.status(500).json({ error: 'Error al obtener operadores', details: error.message });
  }
});

// ============ GEOFENCES ============

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/geofences', (req, res) => {
  db.all('SELECT * FROM geofences ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/samsara/addresses', async (req, res) => {
  try {
    const addressRes = await axios.get('https://api.samsara.com/addresses', {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' }
    });
    const data = addressRes.data;
    const addresses = data.addresses || (Array.isArray(data) ? data : (data.data || []));
    const mapped = (Array.isArray(addresses) ? addresses : []).map(a => ({
      id: a.id,
      nombre: a.name || a.formattedAddress || 'Sin nombre',
      latitud: a.latitude,
      longitud: a.longitude,
      radio_metros: a.geofence?.circle?.radiusMeters || 500,
      descripcion: a.formattedAddress || '',
      color: '#8b5cf6',
      categoria: 'samsara',
      activa: 1,
      polygon: a.geofence?.polygon || null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching Samsara addresses:', error.message);
    res.json([]);
  }
});

app.post('/api/geofences', (req, res) => {
  const { nombre, latitud, longitud, radio_metros, descripcion, color } = req.body;
  if (!nombre || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'nombre, latitud y longitud son requeridos' });
  }
  db.run(
    'INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, latitud, longitud, radio_metros || 500, descripcion || '', color || '#3b82f6'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/geofences/:id', (req, res) => {
  const { nombre, latitud, longitud, radio_metros, descripcion, color, activa } = req.body;
  db.run(
    `UPDATE geofences SET nombre = COALESCE(?, nombre), latitud = COALESCE(?, latitud),
     longitud = COALESCE(?, longitud), radio_metros = COALESCE(?, radio_metros),
     descripcion = COALESCE(?, descripcion), color = COALESCE(?, color), activa = COALESCE(?, activa)
     WHERE id = ?`,
    [nombre, latitud, longitud, radio_metros, descripcion, color, activa, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/geofences/:id', (req, res) => {
  db.run('DELETE FROM geofences WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/geofences/toggle', (req, res) => {
  const { ids, activa } = req.body;
  if (!Array.isArray(ids) || activa === undefined) {
    return res.status(400).json({ error: 'ids (array) y activa (0/1) son requeridos' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`UPDATE geofences SET activa = ? WHERE id IN (${placeholders})`, [activa, ...ids], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/geofence-events', (req, res) => {
  const { vehicle_id, geofence_id, limit: lim } = req.query;
  let query = 'SELECT * FROM geofence_events WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (geofence_id) { query += ' AND geofence_id = ?'; params.push(geofence_id); }
  query += ' ORDER BY created_at DESC';
  if (lim) { query += ' LIMIT ?'; params.push(Number(lim)); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/geofence-events', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM geofence_events', [], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM vehicle_geofence_state', [], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ deleted: this.changes });
      });
    });
  });
});

app.post('/api/webhooks/samsara', (req, res) => {
  try {
    const payload = req.body || {};
    const eventType = payload.eventType;
    if (!['GeofenceEntry', 'GeofenceExit'].includes(eventType)) {
      return res.json({ ok: true, ignored: true });
    }

    const data = payload.data || {};
    const address = data.address || {};
    const geofence = address.geofence || {};
    const vehicle = data.vehicle || {};
    const createdAt = payload.eventTime ? new Date(payload.eventTime).toISOString() : new Date().toISOString();
    const tipo = eventType === 'GeofenceEntry' ? 'entrada' : 'salida';
    const geofenceName = address.name || 'Geocerca Samsara';
    const geofenceId = address.id || null;
    const latitud = geofence.circle?.latitude ?? null;
    const longitud = geofence.circle?.longitude ?? null;

    db.run(
      `INSERT OR IGNORE INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source, event_uid, raw_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'samsara', ?, ?, ?)` ,
      [String(vehicle.id || ''), vehicle.name || '', geofenceId, geofenceName, tipo, latitud, longitud, String(payload.eventId || ''), JSON.stringify(payload), createdAt],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, saved: this.changes > 0 });
      }
    );
  } catch (err) {
    console.error('Webhook Samsara inválido:', err.message);
    res.status(400).json({ error: 'Payload inválido' });
  }
});

app.post('/api/check-geofences', async (req, res) => {
  try {
    const geofences = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM geofences WHERE activa = 1', [], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });

    const prevStates = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM vehicle_geofence_state', [], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
    const prevMap = {};
    for (const p of prevStates) {
      prevMap[`${p.vehicle_id}_${p.geofence_id}`] = p;
    }

    const locRes = await axios.get('https://api.samsara.com/fleet/vehicles/locations', {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' }
    });

    const alerts = [];
    const vehicles = locRes.data?.data || [];

    for (const v of vehicles) {
      if (!v.location) continue;
      const vLat = v.location.latitude;
      const vLon = v.location.longitude;

      for (const g of geofences) {
        const dist = haversineDistance(vLat, vLon, g.latitud, g.longitud);
        const inside = dist <= g.radio_metros;
        const key = `${v.id}_${g.id}`;
        const prev = prevMap[key];
        const wasInside = prev ? prev.inside === 1 : false;

        if (inside && !wasInside) {
          db.run(
            `INSERT INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud) VALUES (?, ?, ?, ?, 'entrada', ?, ?)`,
            [v.id, v.name, g.id, g.nombre, vLat, vLon]
          );
          db.run(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [v.id, v.name, 'geocerca', `${v.name} entró a la geocerca "${g.nombre}"`, 'info']
          );
          alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'entrada' });
        } else if (!inside && wasInside) {
          db.run(
            `INSERT INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud) VALUES (?, ?, ?, ?, 'salida', ?, ?)`,
            [v.id, v.name, g.id, g.nombre, vLat, vLon]
          );
          db.run(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [v.id, v.name, 'geocerca', `${v.name} salió de la geocerca "${g.nombre}"`, 'info']
          );
          alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'salida' });
        }

        db.run(
          `INSERT OR REPLACE INTO vehicle_geofence_state (vehicle_id, geofence_id, inside, last_check)
           VALUES (?, ?, ?, datetime('now'))`,
          [v.id, g.id, inside ? 1 : 0]
        );
      }
    }

    res.json({ checked: vehicles.length, geofences: geofences.length, newAlerts: alerts.length, alerts });
  } catch (error) {
    console.error('Error checking geofences:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FUEL ALERTS ============

app.post('/api/check-fuel', async (req, res) => {
  try {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    const alerts = [];
    for (const v of vehicles) {
      if (v.fuelLevelPercent !== null && v.fuelLevelPercent <= 0.2) {
        const recent = await new Promise((resolve) => {
          db.get(
            `SELECT id FROM alertas WHERE vehicle_id = ? AND tipo = 'combustible_bajo' AND timestamp > datetime('now', '-4 hours')`,
            [String(v.id)],
            (err, row) => resolve(row)
          );
        });

        if (!recent) {
          const pct = Math.round(v.fuelLevelPercent * 100);
          db.run(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [String(v.id), v.name, 'combustible_bajo', `${v.name} tiene ${pct}% de diesel - Nivel bajo`, 'alta']
          );
          alerts.push({ vehicle: v.name, fuel: pct });
        }
      }
    }

    res.json({ checked: vehicles.length, newAlerts: alerts.length, alerts });
  } catch (error) {
    console.error('Error checking fuel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ VIAJES ============

app.get('/api/viajes', (req, res) => {
  db.all(`SELECT * FROM viajes ORDER BY
    CASE LOWER(COALESCE(estado, ''))
      WHEN 'en_ruta_cargado' THEN 0
      WHEN 'en_ruta_vacio' THEN 1
      WHEN 'proceso_carga' THEN 2
      WHEN 'proceso_descarga' THEN 3
      WHEN 'proceso_liberacion' THEN 4
      WHEN 'espera_ingreso' THEN 5
      WHEN 'en_resguardo' THEN 6
      WHEN 'programado' THEN 7
      WHEN 'disponible' THEN 8
      WHEN 'completado' THEN 9
      WHEN 'cancelado' THEN 10
      ELSE 99
    END,
    COALESCE(fecha_inicio, created_at) ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/viajes', (req, res) => {
  const { vehicle_id, vehicle_name, origen, destino, conductor, telefono, fecha_inicio, fecha_fin, notas } = req.body;
  db.run(
    'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, conductor, telefono, remolque, fecha_inicio, fecha_fin, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, origen, destino, conductor, telefono || '', req.body.remolque || '', fecha_inicio, fecha_fin, notas],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/viajes/:id', (req, res) => {
  const { estado } = req.body;
  db.run('UPDATE viajes SET estado = ? WHERE id = ?', [estado, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/viajes/:id', (req, res) => {
  const { vehicle_id, vehicle_name, origen, destino, conductor, telefono, fecha_inicio, fecha_fin, notas, estado, remolque } = req.body;
  db.run(
    'UPDATE viajes SET vehicle_id = ?, vehicle_name = ?, origen = ?, destino = ?, conductor = ?, telefono = ?, fecha_inicio = ?, fecha_fin = ?, notas = ?, estado = ?, remolque = ? WHERE id = ?',
    [vehicle_id || null, vehicle_name || null, origen || null, destino || null, conductor || null, telefono || null, fecha_inicio || null, fecha_fin || null, notas || null, estado || null, remolque || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/viajes/:id', (req, res) => {
  db.run('DELETE FROM viajes WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// ============ ALERTAS ============

app.get('/api/alertas', (req, res) => {
  db.all('SELECT * FROM alertas ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/alertas', (req, res) => {
  const { vehicle_id, vehicle_name, tipo, mensaje, severidad } = req.body;
  db.run(
    'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, tipo, mensaje, severidad || 'info'],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/alertas/:id/leer', (req, res) => {
  db.run('UPDATE alertas SET leida = 1 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/alertas/:id', (req, res) => {
  db.run('DELETE FROM alertas WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/alertas', (req, res) => {
  db.run('DELETE FROM alertas', [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// ============ PENDIENTES ============

app.get('/api/pendientes', (req, res) => {
  const { turno, estado } = req.query;
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (turno) { query += ' AND turno = ?'; params.push(turno); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  query += ' ORDER BY CASE prioridad WHEN "alta" THEN 1 WHEN "media" THEN 2 WHEN "baja" THEN 3 ELSE 4 END, fecha_creacion DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/pendientes', (req, res) => {
  const { titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título es requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO pendientes (titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [titulo, descripcion || '', prioridad || 'media', asignado_a || '', turno || '', notas || '', userName, userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/pendientes/:id', (req, res) => {
  const { titulo, descripcion, prioridad, estado, asignado_a, turno, notas } = req.body;
  db.run(
    'UPDATE pendientes SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, asignado_a = ?, turno = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
    [titulo, descripcion, prioridad, estado, asignado_a, turno, notas, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/pendientes/:id', (req, res) => {
  db.run('DELETE FROM pendientes WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/pendientes/:id/comentarios', (req, res) => {
  db.all('SELECT * FROM comentarios_pendientes WHERE pendiente_id = ? ORDER BY fecha_creacion DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/pendientes/:id/comentarios', (req, res) => {
  const { contenido } = req.body;
  if (!contenido) return res.status(400).json({ error: 'Contenido es requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO comentarios_pendientes (pendiente_id, autor, contenido, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, userName, contenido, userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/api/pendientes/:id/comentarios/:comentarioId', (req, res) => {
  db.run('DELETE FROM comentarios_pendientes WHERE id = ?', [req.params.comentarioId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/pendientes/historial', (req, res) => {
  db.all('SELECT * FROM pendientes_historial ORDER BY archived_at DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/pendientes/archivar-completados', (req, res) => {
  db.all('SELECT * FROM pendientes WHERE estado = "completado" ORDER BY fecha_actualizacion DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.json({ archived: 0 });

    const archivedByUserId = req.user?.id || null;
    const archivedByUsername = actorFromReq(req);

    db.serialize(() => {
      const insertStmt = db.prepare(`
        INSERT INTO pendientes_historial (
          pendiente_id, titulo, descripcion, prioridad, estado, asignado_a, turno, notas,
          creado_por, created_by_user_id, created_by_username, fecha_creacion, fecha_actualizacion,
          archived_by_user_id, archived_by_username
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      rows.forEach((row) => {
        insertStmt.run([
          row.id, row.titulo, row.descripcion || '', row.prioridad || 'media', row.estado || 'completado',
          row.asignado_a || '', row.turno || '', row.notas || '', row.creado_por || '',
          row.created_by_user_id || null, row.created_by_username || '', row.fecha_creacion || null,
          row.fecha_actualizacion || null, archivedByUserId, archivedByUsername,
        ]);
      });

      insertStmt.finalize((finalizeErr) => {
        if (finalizeErr) return res.status(500).json({ error: finalizeErr.message });
        db.run('DELETE FROM pendientes WHERE estado = "completado"', [], function (deleteErr) {
          if (deleteErr) return res.status(500).json({ error: deleteErr.message });
          res.json({ archived: this.changes || rows.length });
        });
      });
    });
  });
});

// ============ COMENTARIOS / SEGUIMIENTO ============

app.get('/api/comentarios', (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM comentarios';
  const params = [];
  if (vehicle_id) {
    query += ' WHERE vehicle_id = ?';
    params.push(vehicle_id);
  }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/comentarios', (req, res) => {
  const { vehicle_id, vehicle_name, tipo, titulo, contenido, kilometraje, remolque, grupo, origen, destino, estatus } = req.body;
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO comentarios (vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje, estatus, remolque, grupo, origen, destino, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, userName, tipo || 'seguimiento', titulo || null, contenido, kilometraje || null, estatus || '', remolque || '', grupo || '', origen || '', destino || '', userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/comentarios/:id', (req, res) => {
  const { titulo, contenido, tipo } = req.body;
  db.run(
    'UPDATE comentarios SET titulo = COALESCE(?, titulo), contenido = COALESCE(?, contenido), tipo = COALESCE(?, tipo) WHERE id = ?',
    [titulo, contenido, tipo, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/comentarios/:id', (req, res) => {
  db.run('DELETE FROM comentarios WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/reportes/seguimiento', (req, res) => {
  const { vehicle_id, fecha_inicio, fecha_fin } = req.query;
  let query = "SELECT * FROM comentarios WHERE tipo IN ('seguimiento', 'incidente', 'mantenimiento')";
  const params = [];
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  if (fecha_inicio) {
    query += ' AND created_at >= ?';
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    query += ' AND created_at <= ?';
    params.push(fecha_fin + ' 23:59:59');
  }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ REPORTES ============

app.get('/api/reportes/resumen', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as total FROM pendientes', [], (err, row) => {
    stats.totalPendientes = row?.total || 0;
    db.get('SELECT COUNT(*) as total FROM viajes', [], (err, row) => {
      stats.totalViajes = row?.total || 0;
      db.get("SELECT COUNT(*) as programados FROM viajes WHERE estado = 'programado'", [], (err, row) => {
        stats.viajesProgramados = row?.programados || 0;
        db.get('SELECT COUNT(*) as total FROM alertas WHERE leida = 0', [], (err, row) => {
          stats.alertasNoLeidas = row?.total || 0;
          res.json(stats);
        });
      });
    });
  });
});

app.get('/api/reportes/pendientes', (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (fecha_inicio) { query += ' AND fecha_creacion >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND fecha_creacion <= ?'; params.push(fecha_fin); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reportes/viajes', (req, res) => {
  const { fecha_inicio, fecha_fin, estado } = req.query;
  let query = 'SELECT * FROM viajes WHERE 1=1';
  const params = [];
  if (fecha_inicio) { query += ' AND fecha_inicio >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND fecha_fin <= ?'; params.push(fecha_fin); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ ROUTE HISTORY ============

app.get('/api/route-history', (req, res) => {
  const { vehicle_id, fecha_inicio, fecha_fin, limit: lim } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  let query = 'SELECT * FROM route_history WHERE vehicle_id = ?';
  const params = [vehicle_id];

  if (fecha_inicio) { query += ' AND recorded_at >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND recorded_at <= ?'; params.push(fecha_fin + ' 23:59:59'); }

  query += ' ORDER BY recorded_at ASC';
  if (lim) { query += ' LIMIT ?'; params.push(Number(lim)); }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/route-history/vehicles', (req, res) => {
  db.all(
    `SELECT vehicle_id, vehicle_name, COUNT(*) as total_points,
            MIN(recorded_at) as primera_ubicacion, MAX(recorded_at) as ultima_ubicacion
     FROM route_history GROUP BY vehicle_id ORDER BY ultima_ubicacion DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/route-history/dates', (req, res) => {
  const { vehicle_id } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  db.all(
    `SELECT DATE(recorded_at) as fecha, COUNT(*) as puntos
     FROM route_history WHERE vehicle_id = ?
     GROUP BY DATE(recorded_at) ORDER BY fecha DESC`,
    [vehicle_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.delete('/api/route-history', (req, res) => {
  const { vehicle_id, fecha } = req.query;
  let query = 'DELETE FROM route_history WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (fecha) { query += ' AND DATE(recorded_at) = ?'; params.push(fecha); }
  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/api/route-history/last', (req, res) => {
  const { vehicle_id, hours } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  const h = Number(hours) || 24;
  db.all(
    `SELECT * FROM route_history WHERE vehicle_id = ? AND recorded_at >= datetime('now', '-' || ? || ' hours') ORDER BY recorded_at ASC`,
    [vehicle_id, h],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.get('/api/viajes/activos', (req, res) => {
  db.all(
    `SELECT v.*, s.remolque as seg_remolque, s.origen as seg_origen, s.destino as seg_destino, s.estatus as seg_estatus,
            s.cita_carga, s.cita_descarga, s.hora_llegada, s.hora_liberacion
      FROM viajes v
      LEFT JOIN seguimiento s ON s.id = (
        SELECT s2.id
        FROM seguimiento s2
        WHERE s2.unidad = v.vehicle_name
        ORDER BY datetime(s2.fecha_actualizacion) DESC, s2.id DESC
        LIMIT 1
      )
      WHERE v.estado NOT IN ('completado', 'cancelado')
     ORDER BY
       CASE LOWER(COALESCE(v.estado, ''))
         WHEN 'en_ruta_cargado' THEN 0
         WHEN 'en_ruta_vacio' THEN 1
         WHEN 'proceso_carga' THEN 2
         WHEN 'proceso_descarga' THEN 3
         WHEN 'proceso_liberacion' THEN 4
         WHEN 'espera_ingreso' THEN 5
         WHEN 'en_resguardo' THEN 6
         WHEN 'programado' THEN 7
         WHEN 'disponible' THEN 8
         ELSE 99
       END,
       COALESCE(v.fecha_inicio, v.created_at) ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ============ CLIENTES ============

app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY nombre ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/clientes', (req, res) => {
  const { nombre, contacto, telefono, email } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  db.run('INSERT INTO clientes (nombre, contacto, telefono, email) VALUES (?, ?, ?, ?)', [nombre, contacto || '', telefono || '', email || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.delete('/api/clientes/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// ============ REMOLQUES ============

app.get('/api/remolques', (req, res) => {
  db.all(`SELECT r.*,
    (SELECT ra.vehicle_name FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as unidad_asignada,
    (SELECT ra.vehicle_id FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as vehicle_id_asignado
    FROM remolques r ORDER BY r.numero ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/remolques', (req, res) => {
  const { numero, categoria = 'Caja Seca' } = req.body;
  if (!numero) return res.status(400).json({ error: 'numero es requerido' });
  db.run('INSERT INTO remolques (numero, categoria) VALUES (?, ?)', [numero.trim(), categoria || 'Caja Seca'], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este número de remolque ya existe' });
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

app.delete('/api/remolques/:id', (req, res) => {
  db.run('DELETE FROM remolques WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/remolques/:id', (req, res) => {
  const { numero, categoria } = req.body;
  if (!numero) return res.status(400).json({ error: 'numero es requerido' });
  db.run('UPDATE remolques SET numero = ?, categoria = ? WHERE id = ?', [numero.trim(), categoria || 'Caja Seca', req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.post('/api/remolques/:id/asignar', (req, res) => {
  const { vehicle_id, vehicle_name } = req.body;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  db.serialize(() => {
    db.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE remolque_id = ? AND activa = 1', [req.params.id]);
    db.run('INSERT INTO remolque_asignaciones (remolque_id, vehicle_id, vehicle_name) VALUES (?, ?, ?)', [req.params.id, vehicle_id, vehicle_name || ''], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });
});

app.post('/api/remolques/:id/desasignar', (req, res) => {
  db.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE remolque_id = ? AND activa = 1', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/remolques/:id/historial', (req, res) => {
  db.all('SELECT * FROM remolque_asignaciones WHERE remolque_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/remolques/asignaciones/activas', (req, res) => {
  db.all('SELECT ra.*, r.numero as remolque_numero FROM remolque_asignaciones ra JOIN remolques r ON r.id = ra.remolque_id WHERE ra.activa = 1', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ============ SEGUIMIENTO ============

app.get('/api/seguimiento', (req, res) => {
  db.all('SELECT * FROM seguimiento ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/seguimiento', (req, res) => {
  const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
  const data = fields.reduce((acc, f) => { acc[f] = req.body[f] || ''; return acc; }, {});
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  data.created_by_user_id = userId;
  data.created_by_username = userName;
  data.fecha_actualizacion = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const cols = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  db.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data), function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/seguimiento/:id', (req, res) => {
  db.get('SELECT * FROM seguimiento WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const userName = actorFromReq(req);
    const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
    const updates = [];
    const values = [];
    fields.forEach(f => {
      const newVal = req.body[f] !== undefined ? req.body[f] : row[f];
      if (String(newVal) !== String(row[f])) {
        db.run('INSERT INTO seguimiento_historial (seguimiento_id, campo, valor_anterior, valor_nuevo, usuario) VALUES (?, ?, ?, ?, ?)', [req.params.id, f, row[f] || '', newVal || '', userName]);
      }
      updates.push(`${f} = ?`);
      values.push(newVal || '');
    });
    updates.push("fecha_actualizacion = datetime('now')");
    values.push(req.params.id);
    db.run(`UPDATE seguimiento SET ${updates.join(', ')} WHERE id = ?`, values, function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ changes: this.changes });
    });
  });
});

app.delete('/api/seguimiento/:id', (req, res) => {
  db.get('SELECT * FROM seguimiento WHERE id = ?', [req.params.id], (err, row) => {
    if (row) {
      const userName = actorFromReq(req);
      const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
      fields.forEach(f => {
        db.run('INSERT INTO seguimiento_historial (seguimiento_id, campo, valor_anterior, valor_nuevo, usuario) VALUES (?, ?, ?, ?, ?)', [req.params.id, f, row[f] || '', '', userName]);
      });
    }
    db.run('DELETE FROM seguimiento WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    });
  });
});

app.get('/api/seguimiento/:id/historial', (req, res) => {
  db.all('SELECT * FROM seguimiento_historial WHERE seguimiento_id = ? ORDER BY fecha_cambio DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/seguimiento/historial/todas', (req, res) => {
  db.all('SELECT sh.*, s.unidad FROM seguimiento_historial sh LEFT JOIN seguimiento s ON s.id = sh.seguimiento_id ORDER BY sh.fecha_cambio DESC LIMIT 500', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/seguimiento/import', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Array de registros requerido' });
  let imported = 0;
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.serialize(() => {
    db.run('DELETE FROM seguimiento');
    items.forEach(item => {
      const data = {
        unidad: item.UNIDAD || '',
        operador: item.OPERADOR || '',
        remolque: item.REMOLQUE || '',
        ruta: item.RUTA || '',
        origen: item.ORIGEN || '',
        destino: item.DESTINO || '',
        cita_carga: item['CITA CARGA'] || '',
        cita_descarga: item['CITA DESCARGA'] || '',
        hora_llegada: item['HORA LLEGADA CON CLIENTE'] || '',
        hora_liberacion: item['HORA LIBERACION CLIENTE'] || '',
        estatus: item.ESTATUS || 'Disponible',
        comentarios_cliente: item['COMENTARIOS CLIENTE'] || '',
        comentarios_monitoreo: item['COMENTARIOS MONITOREO'] || '',
        grupo: item.GRUPO || '',
        created_by_user_id: userId,
        created_by_username: userName,
        fecha_actualizacion: item['HORA ACTUALIZACION'] || new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      const cols = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      db.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
      imported++;
    });
  }, () => { res.json({ imported }); });
});

// ============ RISK ZONES ============

app.get('/api/risk-zones', (req, res) => {
  db.all('SELECT * FROM risk_zones ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/risk-zones', (req, res) => {
  const { name, description, severity, lat, lng, radius } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng son requeridos' });
  }
  db.run(
    'INSERT INTO risk_zones (name, description, severity, lat, lng, radius) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || '', severity || 'high', lat, lng, radius || 5000],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, severity, lat, lng, radius });
    }
  );
});

app.delete('/api/risk-zones/:id', (req, res) => {
  db.run('DELETE FROM risk_zones WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ UNIDADES MANUALES ============

app.get('/api/unidades', (req, res) => {
  db.all('SELECT * FROM unidades ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/unidades', (req, res) => {
  const { nombre, estatus, notas, tipo, samsara_id } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
  db.run(
    'INSERT INTO unidades (nombre, estatus, notas, tipo, samsara_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, estatus || 'Activa', notas || '', tipo || 'manual', samsara_id || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, nombre, estatus: estatus || 'Activa', notas: notas || '', tipo: tipo || 'manual', samsara_id: samsara_id || '' });
    }
  );
});

app.put('/api/unidades/:id', (req, res) => {
  const { nombre, estatus, notas, tipo, samsara_id } = req.body;
  db.run(
    `UPDATE unidades SET nombre = ?, estatus = ?, notas = ?, tipo = ?, samsara_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [nombre, estatus, notas, tipo, samsara_id || '', req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ AUTO-CHECK INTERVALS ============

setInterval(async () => {
  try {
    await fetch('http://localhost:' + PORT + '/api/check-geofences', { method: 'POST' });
    await fetch('http://localhost:' + PORT + '/api/check-fuel', { method: 'POST' });
  } catch (e) {}
}, 300000);

app.listen(PORT, () => {
  console.log(`Servidor GERS corriendo en puerto ${PORT}`);
});
