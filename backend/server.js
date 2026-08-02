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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SAMSARA_API_BASE_URL = (process.env.SAMSARA_API_BASE_URL || 'https://api.samsara.com').replace(/\/$/, '');
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || FRONTEND_URL).split(',').map(origin => origin.trim()).filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    const allowPrivateOrigins = !IS_PRODUCTION || process.env.ALLOW_PRIVATE_NETWORK_ORIGINS === 'true';
    const localDevelopmentOrigin = allowPrivateOrigins && origin && (
      /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
      /^https?:\/\/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?$/.test(origin)
    );
    callback(null, !origin || allowedOrigins.has(origin) || localDevelopmentOrigin);
  },
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buffer) => {
    if (req.originalUrl.split('?')[0] === '/api/webhooks/samsara') req.rawBody = Buffer.from(buffer);
  },
}));

app.get('/health', (req, res) => {
  db.get('SELECT 1 AS ok', [], (err) => {
    if (err) return res.status(503).json({ status: 'unhealthy' });
    res.json({ status: 'ok' });
  });
});

app.get('/api/live', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const queryToken = req.query.token || req.query.access_token;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-auth-token'] || queryToken);
    if (!token || Array.isArray(token)) return res.status(401).json({ error: 'No autenticado' });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    await refreshSession(token);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write('event: connected\ndata: {"type":"connected"}\n\n');
    liveClients.add(res);

    req.on('close', () => {
      liveClients.delete(res);
    });
  } catch (err) {
    console.error('Error de autenticación SSE:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error de autenticación' });
    else res.end();
  }
});

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  let notified = false;
  res.on('finish', () => {
    if (!notified && res.statusCode < 400) {
      notified = true;
      broadcastLiveUpdate('reload', { method: req.method, path: req.path });
    }
  });
  next();
});

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'gers.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) { fs.mkdirSync(dbDir, { recursive: true }); }
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('Conectado a SQLite en', dbPath);
});
db.configure('busyTimeout', 10000);

const PBKDF2_ITERATIONS = 120000;
const SESSION_DAYS = 30;
const GEOCODE_CACHE_MAX_ENTRIES = 100;
const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000;
const geocodeCache = new Map();

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

async function withTransaction(work) {
  const transactionDb = new sqlite3.Database(dbPath);
  transactionDb.configure('busyTimeout', 10000);
  const tx = {
    run: (sql, params = []) => new Promise((resolve, reject) => {
      transactionDb.run(sql, params, function (err) {
        if (err) reject(err); else resolve(this);
      });
    }),
    get: (sql, params = []) => new Promise((resolve, reject) => {
      transactionDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    }),
    all: (sql, params = []) => new Promise((resolve, reject) => {
      transactionDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
  };
  try {
    await tx.run('PRAGMA foreign_keys = ON');
    await tx.run('BEGIN IMMEDIATE');
    const result = await work(tx);
    await tx.run('COMMIT');
    return result;
  } catch (error) {
    try { await tx.run('ROLLBACK'); } catch {}
    throw error;
  } finally {
    transactionDb.close();
  }
}

const liveClients = new Set();

function broadcastLiveUpdate(type = 'reload', detail = {}) {
  const payload = `event: ${type}\ndata: ${JSON.stringify({ type, detail, ts: Date.now() })}\n\n`;
  for (const client of liveClients) {
    try {
      client.write(payload);
    } catch {
      liveClients.delete(client);
    }
  }
}

async function getUserByToken(token) {
  return getQuery(
    `SELECT u.id, u.username, u.nombre, u.rol
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.revoked = 0 AND s.expires_at > CURRENT_TIMESTAMP AND u.activo = 1`,
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
    const configuredUser = String(process.env.ADMIN_USERNAME || '').trim();
    const configuredPass = String(process.env.ADMIN_PASSWORD || '');
    if (user?.total > 0 && !configuredUser) return;
    const adminUser = configuredUser || (!IS_PRODUCTION ? 'admin' : '');
    const adminPass = configuredPass || (!IS_PRODUCTION ? 'admin123' : '');
    if (!adminUser || !adminPass) {
      throw new Error('ADMIN_USERNAME y ADMIN_PASSWORD son requeridos para crear el primer administrador');
    }
    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [adminUser]);
    if (existing) return;
    const name = process.env.ADMIN_NAME || 'Administrador';
    const { salt, hash } = hashPassword(adminPass);
    await runQuery(
      'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [adminUser, hash, salt, name, 'admin']
    );
    console.log(`Usuario admin inicial creado: ${adminUser}`);
  } catch (err) {
    console.error('No se pudo crear el usuario admin inicial:', err.message);
    throw err;
  }
}

const databaseReady = new Promise((resolve, reject) => db.serialize(() => {
  const finishInitialization = err => err ? reject(err) : resolve();
  db.run('PRAGMA foreign_keys = ON', [], err => {
    if (err) reject(err);
  });
  db.run(`CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    origen TEXT,
    destino TEXT,
    tipo_entrega TEXT DEFAULT 'directo',
    destinos_json TEXT DEFAULT '[]',
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
  db.run("ALTER TABLE viajes ADD COLUMN tipo_entrega TEXT DEFAULT 'directo'", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN destinos_json TEXT DEFAULT '[]'", [], () => {});

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
    comentarios_resumen TEXT,
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
    direccion TEXT DEFAULT '',
    latitud REAL NOT NULL,
    longitud REAL NOT NULL,
    radio_metros REAL DEFAULT 500,
    descripcion TEXT,
    color TEXT DEFAULT '#3b82f6',
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE geofences ADD COLUMN direccion TEXT DEFAULT ''", [], () => {});
  db.run('ALTER TABLE geofences ADD COLUMN cliente_id INTEGER', [], () => {});
  db.run('CREATE INDEX IF NOT EXISTS idx_geofences_cliente ON geofences(cliente_id)', [], () => {});

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
    source_time_ms INTEGER,
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
  db.run('ALTER TABLE route_history ADD COLUMN source_time_ms INTEGER', [], () => {});
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_route_history_vehicle_source_time ON route_history(vehicle_id, source_time_ms) WHERE source_time_ms IS NOT NULL');

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
  db.run("ALTER TABLE pendientes_historial ADD COLUMN created_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE pendientes_historial ADD COLUMN created_by_username TEXT", [], () => {});
  db.run("ALTER TABLE pendientes_historial ADD COLUMN archived_by_user_id INTEGER", [], () => {});
  db.run("ALTER TABLE pendientes_historial ADD COLUMN archived_by_username TEXT", [], () => {});
  db.run("ALTER TABLE pendientes_historial ADD COLUMN comentarios_resumen TEXT", [], () => {});
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
    tipo_asignacion TEXT DEFAULT 'sencillo',
    grupo_full TEXT,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cliente_geofence_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    geofence_ref TEXT NOT NULL,
    geofence_nombre TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, geofence_ref),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_cliente_geofence_links_cliente ON cliente_geofence_links(cliente_id)', [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS mapas_mymaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    origen TEXT,
    destino TEXT,
    url TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE remolque_asignaciones ADD COLUMN tipo_asignacion TEXT DEFAULT 'sencillo'", [], () => {});
  db.run('ALTER TABLE remolque_asignaciones ADD COLUMN grupo_full TEXT', [], () => {});
  db.run("UPDATE remolque_asignaciones SET tipo_asignacion = 'sencillo' WHERE tipo_asignacion IS NULL OR tipo_asignacion = ''");
  db.run(`UPDATE remolque_asignaciones SET activa = 0, fecha_fin = COALESCE(fecha_fin, CURRENT_TIMESTAMP)
          WHERE activa = 1 AND id NOT IN (SELECT MAX(id) FROM remolque_asignaciones WHERE activa = 1 GROUP BY remolque_id)`);
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_remolque_asignacion_activa_remolque ON remolque_asignaciones(remolque_id) WHERE activa = 1');
  db.run('DROP INDEX IF EXISTS idx_remolque_asignacion_activa_vehicle');
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_remolque_asignacion_activa_vehicle_sencillo
          ON remolque_asignaciones(vehicle_id) WHERE activa = 1 AND grupo_full IS NULL`);
  db.run(`UPDATE remolques SET status = CASE
            WHEN EXISTS (SELECT 1 FROM remolque_asignaciones ra WHERE ra.remolque_id = remolques.id AND ra.activa = 1) THEN 'asignado'
            ELSE 'disponible' END`);

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
    if (err) return finishInitialization(err);
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)');
      catalogGeofences.forEach(g => {
        stmt.run(g.nombre, g.latitud, g.longitud, g.radio_metros, g.descripcion, g.color, g.categoria);
      });
      stmt.finalize(finalizeErr => {
        if (!finalizeErr) console.log(`Seeded ${catalogGeofences.length} geocercas del catálogo`);
        finishInitialization(finalizeErr);
      });
    } else {
      db.all('SELECT nombre FROM geofences', [], (e, existing) => {
        if (e) return finishInitialization(e);
        const existingNames = new Set((existing || []).map(r => r.nombre));
        const missing = catalogGeofences.filter(g => !existingNames.has(g.nombre));
        if (missing.length > 0) {
          const stmt = db.prepare('INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)');
          missing.forEach(g => {
            stmt.run(g.nombre, g.latitud, g.longitud, g.radio_metros, g.descripcion, g.color, g.categoria);
          });
          stmt.finalize(finalizeErr => {
            if (!finalizeErr) console.log(`Seeded ${missing.length} geocercas faltantes del catálogo`);
            finishInitialization(finalizeErr);
          });
        } else finishInitialization();
      });
    }
  });
}));

const samsaraApi = axios.create({
  baseURL: `${SAMSARA_API_BASE_URL}/v1`,
  timeout: 15000,
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
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS).toISOString();
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

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Usuario inválido' });
  if (userId === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  try {
    const target = await getQuery('SELECT id, username, rol, activo FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.rol === 'admin' && target.activo) {
      const admins = await getQuery("SELECT COUNT(*) AS total FROM users WHERE rol = 'admin' AND activo = 1");
      if (admins.total <= 1) return res.status(400).json({ error: 'No se puede eliminar el último administrador activo' });
    }
    await withTransaction(async tx => {
      await tx.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
      await tx.run('DELETE FROM users WHERE id = ?', [userId]);
    });
    res.json({ deleted: 1, id: userId });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
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

app.post('/api/turnos/entregar', requireAuth, async (req, res) => {
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

app.post('/api/turnos/resumen', requireAuth, async (req, res) => {
  try {
    const { horas = 8, turno = '', observaciones = '' } = req.body || {};
    const summary = await getTurnoSummary(horas, turno, observaciones);
    res.json({ summary });
  } catch (err) {
    console.error('Error al generar resumen de turno:', err);
    res.status(500).json({ error: 'Error al generar resumen de turno' });
  }
});

app.get('/api/turnos/entregas', requireAuth, async (req, res) => {
  try {
    const reports = await allQuery('SELECT * FROM turnos_reportes ORDER BY created_at DESC LIMIT 50');
    res.json(reports);
  } catch (err) {
    console.error('Error al consultar reportes de turno:', err);
    res.status(500).json({ error: 'Error al consultar reportes de turno' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/webhooks/samsara') return next();
  return requireAuth(req, res, next);
});

function normalizeDestination(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX');
}

function getCachedGeocode(key) {
  const cached = geocodeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > GEOCODE_CACHE_TTL_MS) {
    geocodeCache.delete(key);
    return null;
  }
  geocodeCache.delete(key);
  geocodeCache.set(key, cached);
  return cached.value;
}

function cacheGeocode(key, value) {
  geocodeCache.set(key, { value, cachedAt: Date.now() });
  if (geocodeCache.size > GEOCODE_CACHE_MAX_ENTRIES) {
    geocodeCache.delete(geocodeCache.keys().next().value);
  }
}

function parseCoordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

async function geocodeAddress(address) {
  const cacheKey = normalizeDestination(address);
  const cached = getCachedGeocode(cacheKey);
  if (cached) return cached;
  const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: address, format: 'jsonv2', limit: 1 },
    headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
    timeout: 15000,
  });
  const first = Array.isArray(geoRes.data) ? geoRes.data[0] : null;
  if (!first) return null;
  const lat = parseCoordinate(first.lat, -90, 90);
  const lon = parseCoordinate(first.lon, -180, 180);
  if (lat === null || lon === null) throw new Error('Nominatim devolvió coordenadas inválidas');
  const result = { nombre: first.display_name || first.name || address, lat, lon };
  cacheGeocode(cacheKey, result);
  return result;
}

app.post('/api/calculate-route', async (req, res) => {
  const destino = typeof req.body?.destino === 'string' ? req.body.destino.trim().replace(/\s+/g, ' ') : '';
  const origen = typeof req.body?.origen === 'string' ? req.body.origen.trim().replace(/\s+/g, ' ') : '';
  let latOrigen = parseCoordinate(req.body?.lat_origen, -90, 90);
  let lonOrigen = parseCoordinate(req.body?.lon_origen, -180, 180);
  const latDestino = parseCoordinate(req.body?.lat_destino, -90, 90);
  const lonDestino = parseCoordinate(req.body?.lon_destino, -180, 180);
  if (!destino || destino.length > 300) {
    return res.status(400).json({ error: 'destino es requerido y debe tener máximo 300 caracteres' });
  }
  if ((latOrigen === null || lonOrigen === null) && (!origen || origen.length > 300)) {
    return res.status(400).json({ error: 'Se requieren coordenadas válidas o una dirección de origen' });
  }

  try {
    const [destination, originLocation] = await Promise.all([
      latDestino !== null && lonDestino !== null
        ? Promise.resolve({ nombre: destino, lat: latDestino, lon: lonDestino })
        : geocodeAddress(destino),
      latOrigen === null || lonOrigen === null ? geocodeAddress(origen) : Promise.resolve(null),
    ]);
    if (!destination) return res.status(404).json({ error: 'No se encontró el destino' });
    if (originLocation) {
      latOrigen = originLocation.lat;
      lonOrigen = originLocation.lon;
    }
    if (latOrigen === null || lonOrigen === null) return res.status(404).json({ error: 'No se encontró el origen' });

    const routeRes = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${lonOrigen},${latOrigen};${destination.lon},${destination.lat}`,
      {
        params: { overview: 'false', alternatives: 'false', steps: 'false' },
        headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
        timeout: 15000,
      }
    );
    const route = routeRes.data?.routes?.[0];
    if (routeRes.data?.code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
      return res.status(422).json({ error: 'No se pudo calcular una ruta para el destino' });
    }
    res.json({
      origen: originLocation,
      destino: destination,
      distancia_metros: route.distance,
      duracion_segundos: route.duration,
    });
  } catch (error) {
    console.error('Error al calcular ruta:', error.message);
    res.status(502).json({ error: 'El servicio externo de rutas no está disponible' });
  }
});

function validMyMapsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    return ['http:', 'https:'].includes(parsed.protocol) && (
      host === 'google.com' || host.endsWith('.google.com') ||
      host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com')
    );
  } catch {
    return false;
  }
}

app.get('/api/mapas', async (req, res) => {
  try {
    res.json(await allQuery('SELECT * FROM mapas_mymaps ORDER BY created_at DESC, id DESC'));
  } catch (err) {
    console.error('Error al listar mapas:', err);
    res.status(500).json({ error: 'Error al listar mapas' });
  }
});

app.post('/api/mapas', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  if (!validMyMapsUrl(url)) return res.status(400).json({ error: 'url debe ser HTTP(S) de google.com o googleusercontent.com' });
  try {
    const result = await runQuery(
      `INSERT INTO mapas_mymaps (nombre, descripcion, origen, destino, url, created_by_user_id, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, req.body.descripcion ?? null, req.body.origen ?? null, req.body.destino ?? null, url, req.user.id, req.user.username]
    );
    res.status(201).json(await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [result.lastID]));
  } catch (err) {
    console.error('Error al crear mapa:', err);
    res.status(500).json({ error: 'Error al crear mapa' });
  }
});

app.put('/api/mapas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mapa inválido' });
  const has = key => Object.prototype.hasOwnProperty.call(req.body || {}, key);
  try {
    const current = await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Mapa no encontrado' });
    if (has('nombre') && typeof req.body.nombre !== 'string') {
      return res.status(400).json({ error: 'nombre debe ser texto' });
    }
    if (has('url') && typeof req.body.url !== 'string') {
      return res.status(400).json({ error: 'url debe ser texto' });
    }
    const nombre = has('nombre') ? req.body.nombre.trim() : current.nombre;
    const url = has('url') ? req.body.url.trim() : current.url;
    if (!nombre) return res.status(400).json({ error: 'nombre no puede estar vacío' });
    if (!validMyMapsUrl(url)) return res.status(400).json({ error: 'url debe ser HTTP(S) de google.com o googleusercontent.com' });
    await runQuery(
      `UPDATE mapas_mymaps SET nombre = ?, descripcion = ?, origen = ?, destino = ?, url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nombre,
        has('descripcion') ? req.body.descripcion : current.descripcion,
        has('origen') ? req.body.origen : current.origen,
        has('destino') ? req.body.destino : current.destino,
        url,
        id,
      ]
    );
    res.json(await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [id]));
  } catch (err) {
    console.error('Error al actualizar mapa:', err);
    res.status(500).json({ error: 'Error al actualizar mapa' });
  }
});

app.delete('/api/mapas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mapa inválido' });
  try {
    const current = await getQuery('SELECT id, created_by_user_id FROM mapas_mymaps WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Mapa no encontrado' });
    if (req.user.rol !== 'admin' && current.created_by_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el propietario o un administrador puede eliminar este mapa' });
    }
    const result = await runQuery('DELETE FROM mapas_mymaps WHERE id = ?', [id]);
    res.json({ deleted: result.changes, id });
  } catch (err) {
    console.error('Error al eliminar mapa:', err);
    res.status(500).json({ error: 'Error al eliminar mapa' });
  }
});

// ============ SAMSARA VEHICLES + LOCATIONS ============

async function performSamsaraVehicleRefresh() {
  try {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    let locationsMap = {};
    try {
      const locations = await fetchSamsaraVehicleLocations();

      for (const v of locations) {
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
            `INSERT OR IGNORE INTO route_history (vehicle_id, vehicle_name, latitude, longitude, speed, heading, location, source_time_ms, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [v.id, v.name || null, v.location.latitude, v.location.longitude, v.location.speed, v.location.heading, v.location.reverseGeo?.formattedLocation || '', locTime, new Date(locTime).toISOString().replace('T', ' ').replace('Z', '')],
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
    return enrichedVehicles;
  } catch (error) {
    console.error('Error Samsara API:', error.message);
    throw error;
  }
}

let samsaraRefreshInFlight = null;
function refreshSamsaraVehicles() {
  if (!samsaraRefreshInFlight) {
    samsaraRefreshInFlight = performSamsaraVehicleRefresh().finally(() => { samsaraRefreshInFlight = null; });
  }
  return samsaraRefreshInFlight;
}

app.get('/api/samsara/vehicles', async (req, res) => {
  try {
    const enrichedVehicles = await refreshSamsaraVehicles();
    res.json(enrichedVehicles);
  } catch (error) {
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
  db.get('SELECT * FROM vehicle_operators WHERE vehicle_id = ?', [req.params.vehicleId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      vehicle_name: has('vehicle_name') ? req.body.vehicle_name : (row?.vehicle_name || null),
      operator_name: has('operator_name') ? req.body.operator_name : (row?.operator_name || ''),
      telefono: has('telefono') ? req.body.telefono : (row?.telefono || ''),
    };
    if (row) {
      db.run(
        'UPDATE vehicle_operators SET vehicle_name = ?, operator_name = ?, telefono = ?, updated_at = datetime(\'now\') WHERE vehicle_id = ?',
        [next.vehicle_name, next.operator_name, next.telefono, req.params.vehicleId],
        function (runErr) {
          if (runErr) return res.status(500).json({ error: runErr.message });
          res.json({ changes: this.changes });
        }
      );
    } else {
      db.run(
        'INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, telefono, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))',
        [req.params.vehicleId, next.vehicle_name, next.operator_name, next.telefono],
        function (runErr) {
          if (runErr) return res.status(500).json({ error: runErr.message });
          res.json({ changes: this.changes });
        }
      );
    }
  });
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
        params,
        timeout: 15000,
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

function mapSamsaraAddress(address) {
  const circle = address.geofence?.circle || {};
  return {
    id: address.id,
    nombre: address.name || address.formattedAddress || 'Sin nombre',
    latitud: circle.latitude ?? address.latitude,
    longitud: circle.longitude ?? address.longitude,
    radio_metros: circle.radiusMeters || 500,
    descripcion: address.formattedAddress || '',
    color: '#8b5cf6',
    categoria: 'samsara',
    activa: 1,
    polygon: address.geofence?.polygon || null,
  };
}

async function fetchSamsaraAddresses() {
  const addresses = [];
  let after = null;
  do {
    const addressRes = await axios.get(`${SAMSARA_API_BASE_URL}/addresses`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: after ? { after } : {},
      timeout: 15000,
    });
    const data = addressRes.data || {};
    const batch = data.addresses || (Array.isArray(data) ? data : (data.data || []));
    addresses.push(...(Array.isArray(batch) ? batch : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return addresses.map(mapSamsaraAddress);
}

async function fetchSamsaraVehicleLocations() {
  const vehicles = [];
  let after = null;
  do {
    const locRes = await axios.get(`${SAMSARA_API_BASE_URL}/fleet/vehicles/locations`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: after ? { after } : {},
      timeout: 15000,
    });
    const data = locRes.data || {};
    vehicles.push(...(Array.isArray(data.data) ? data.data : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return vehicles;
}

function pointInsidePolygon(latitude, longitude, polygon) {
  const vertices = Array.isArray(polygon) ? polygon : polygon?.vertices;
  if (!Array.isArray(vertices) || vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const yi = Number(vertices[i]?.latitude);
    const xi = Number(vertices[i]?.longitude);
    const yj = Number(vertices[j]?.latitude);
    const xj = Number(vertices[j]?.longitude);
    if (![yi, xi, yj, xj].every(Number.isFinite)) continue;
    const intersects = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInsideGeofence(latitude, longitude, geofence) {
  if (geofence.polygon) return pointInsidePolygon(latitude, longitude, geofence.polygon);
  const centerLat = Number(geofence.latitud);
  const centerLon = Number(geofence.longitud);
  const radius = Number(geofence.radio_metros);
  if (![latitude, longitude, centerLat, centerLon, radius].every(Number.isFinite)) return false;
  return haversineDistance(latitude, longitude, centerLat, centerLon) <= radius;
}

app.get('/api/geofences', (req, res) => {
  const clienteId = req.query.cliente_id;
  const query = clienteId ? 'SELECT * FROM geofences WHERE cliente_id = ? ORDER BY created_at DESC' : 'SELECT * FROM geofences ORDER BY created_at DESC';
  const params = clienteId ? [clienteId] : [];
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/samsara/addresses', async (req, res) => {
  try {
    res.json(await fetchSamsaraAddresses());
  } catch (error) {
    console.error('Error fetching Samsara addresses:', error.message);
    res.json([]);
  }
});

app.post('/api/geofences', async (req, res) => {
  const { nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id: clienteId } = req.body;
  if (!nombre || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'nombre, latitud y longitud son requeridos' });
  }
  if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
    const client = await getQuery('SELECT id FROM clientes WHERE id = ?', [clienteId]).catch(error => {
      res.status(500).json({ error: error.message });
      return null;
    });
    if (res.headersSent) return;
    if (!client) return res.status(400).json({ error: 'Cliente no encontrado' });
  }
  db.run(
    'INSERT INTO geofences (nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, direccion || '', latitud, longitud, radio_metros || 500, descripcion || '', color || '#3b82f6', clienteId || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/geofences/toggle', (req, res) => {
  const { ids, activa } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || activa === undefined) {
    return res.status(400).json({ error: 'ids (array) y activa (0/1) son requeridos' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`UPDATE geofences SET activa = ? WHERE id IN (${placeholders})`, [activa, ...ids], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/geofences/:id', (req, res) => {
  const { nombre, direccion, latitud, longitud, radio_metros, descripcion, color, activa, cliente_id: clienteId } = req.body;
  db.run(
    `UPDATE geofences SET nombre = COALESCE(?, nombre), latitud = COALESCE(?, latitud),
     direccion = COALESCE(?, direccion), longitud = COALESCE(?, longitud), radio_metros = COALESCE(?, radio_metros),
     descripcion = COALESCE(?, descripcion), color = COALESCE(?, color), activa = COALESCE(?, activa), cliente_id = COALESCE(?, cliente_id)
     WHERE id = ?`,
    [nombre, latitud, direccion, longitud, radio_metros, descripcion, color, activa, clienteId, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.post('/api/geocode-address', async (req, res) => {
  const { address } = req.body || {};
  if (!address || !String(address).trim()) return res.status(400).json({ error: 'address es requerido' });
  try {
    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'jsonv2', limit: 1 },
      headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
      timeout: 15000,
    });
    const first = Array.isArray(geoRes.data) ? geoRes.data[0] : null;
    if (!first) return res.status(404).json({ error: 'No se encontró la dirección' });
    res.json({
      latitud: Number(first.lat),
      longitud: Number(first.lon),
      direccion: first.display_name || address,
      nombre: first.name || address,
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo geocodificar la dirección', details: error.message });
  }
});

app.delete('/api/geofences/:id', (req, res) => {
  db.run('DELETE FROM geofences WHERE id = ?', [req.params.id], function (err) {
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

app.delete('/api/geofence-events', requireAdmin, async (req, res) => {
  try {
    const deleted = await withTransaction(async tx => {
      await tx.run('DELETE FROM geofence_events');
      const states = await tx.run('DELETE FROM vehicle_geofence_state');
      return states.changes;
    });
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function validWebhookSignature(req) {
  const secret = process.env.SAMSARA_WEBHOOK_SECRET;
  if (!secret) return !IS_PRODUCTION;
  const timestamp = String(req.headers['x-samsara-timestamp'] || '');
  const supplied = String(req.headers['x-samsara-signature'] || '');
  if (!timestamp || !/^v1=[a-f0-9]{64}$/i.test(supplied) || !Buffer.isBuffer(req.rawBody)) return false;
  const message = Buffer.concat([Buffer.from(`v1:${timestamp}:`), req.rawBody]);
  const digest = crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(message).digest('hex');
  const expected = `v1=${digest}`;
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

app.post('/api/webhooks/samsara', (req, res) => {
  try {
    if (!validWebhookSignature(req)) return res.status(401).json({ error: 'Firma de webhook inválida' });
    const payload = req.body || {};
    const eventType = payload.eventType;
    const standardEvent = eventType === 'Alert' ? (payload.event || {}) : null;
    const standardCondition = standardEvent?.alertConditionId;
    const isStandardGeofence = ['DeviceLocationInsideGeofence', 'DeviceLocationOutsideGeofence'].includes(standardCondition);
    const isLegacyGeofence = ['GeofenceEntry', 'GeofenceExit'].includes(eventType);
    if (!isStandardGeofence && !isLegacyGeofence) {
      return res.json({ ok: true, ignored: true });
    }

    const data = payload.data || {};
    const address = data.address || {};
    const geofence = address.geofence || {};
    const vehicle = isStandardGeofence ? (standardEvent.device || standardEvent.vehicle || {}) : (data.vehicle || {});
    const eventTime = isStandardGeofence
      ? (standardEvent.startMs || payload.eventMs || Date.now())
      : (payload.eventTime || Date.now());
    const createdAt = new Date(eventTime).toISOString();
    const tipo = (eventType === 'GeofenceEntry' || standardCondition === 'DeviceLocationInsideGeofence') ? 'entrada' : 'salida';
    const details = String(standardEvent?.details || standardEvent?.summary || '');
    const geofenceMatch = details.match(/\b(?:inside|outside)\s+(.+?)(?:\s+for more than\s+\d+\s+minutes)?\.?$/i);
    const geofenceName = isStandardGeofence ? (geofenceMatch?.[1] || 'Geocerca Samsara') : (address.name || 'Geocerca Samsara');
    const geofenceId = isStandardGeofence ? null : (address.id || null);
    const latitud = isStandardGeofence ? (standardEvent.location?.latitude ?? null) : (geofence.circle?.latitude ?? null);
    const longitud = isStandardGeofence ? (standardEvent.location?.longitude ?? null) : (geofence.circle?.longitude ?? null);

    db.run(
      `INSERT OR IGNORE INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source, event_uid, raw_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'samsara', ?, ?, ?)` ,
      [String(vehicle.id || ''), vehicle.name || '', geofenceId, geofenceName, tipo, latitud, longitud, payload.eventId ? String(payload.eventId) : null, JSON.stringify(payload), createdAt],
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

async function performGeofenceCheck() {
    const localGeofences = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM geofences WHERE activa = 1', [], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
    let samsaraGeofences = [];
    try {
      samsaraGeofences = await fetchSamsaraAddresses();
    } catch (error) {
      console.error('Error fetching Samsara geofences:', error.message);
    }
    const geofences = [
      ...localGeofences.map(g => ({ ...g, stateId: String(g.id), eventId: g.id, source: 'local' })),
      ...samsaraGeofences.map(g => ({
        ...g,
        stateId: `samsara:${g.id || `${g.nombre}:${g.latitud}:${g.longitud}`}`,
        eventId: `samsara:${g.id || `${g.nombre}:${g.latitud}:${g.longitud}`}`,
        source: 'samsara',
      })),
    ];

    const prevStates = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM vehicle_geofence_state', [], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
    const prevMap = {};
    for (const p of prevStates) {
      prevMap[`${p.vehicle_id}_${p.geofence_id}`] = p;
    }

    const alerts = [];
    const vehicles = await fetchSamsaraVehicleLocations();

    for (const v of vehicles) {
      if (!v.location) continue;
      const vLat = v.location.latitude;
      const vLon = v.location.longitude;

      for (const g of geofences) {
        const inside = pointInsideGeofence(vLat, vLon, g);
        const key = `${v.id}_${g.stateId}`;
        const prev = prevMap[key];
        const wasInside = prev ? prev.inside === 1 : false;

        if (inside && !wasInside) {
          await runQuery(
            `INSERT INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source) VALUES (?, ?, ?, ?, 'entrada', ?, ?, ?)`,
            [v.id, v.name, g.eventId, g.nombre, vLat, vLon, g.source]
          );
          await runQuery(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [v.id, v.name, 'geocerca', `${v.name} entró a la geocerca "${g.nombre}"`, 'info']
          );
          alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'entrada' });
        } else if (!inside && wasInside) {
          await runQuery(
            `INSERT INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source) VALUES (?, ?, ?, ?, 'salida', ?, ?, ?)`,
            [v.id, v.name, g.eventId, g.nombre, vLat, vLon, g.source]
          );
          await runQuery(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [v.id, v.name, 'geocerca', `${v.name} salió de la geocerca "${g.nombre}"`, 'info']
          );
          alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'salida' });
        }

        await runQuery(
          `INSERT OR REPLACE INTO vehicle_geofence_state (vehicle_id, geofence_id, inside, last_check)
           VALUES (?, ?, ?, datetime('now'))`,
          [v.id, g.stateId, inside ? 1 : 0]
        );
      }
    }

    return { checked: vehicles.length, geofences: geofences.length, newAlerts: alerts.length, alerts };
}

let geofenceCheckInFlight = null;
function checkGeofences() {
  if (!geofenceCheckInFlight) {
    geofenceCheckInFlight = performGeofenceCheck().finally(() => { geofenceCheckInFlight = null; });
  }
  return geofenceCheckInFlight;
}

app.post('/api/check-geofences', async (req, res) => {
  try {
    res.json(await checkGeofences());
  } catch (error) {
    console.error('Error checking geofences:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FUEL ALERTS ============

async function performFuelCheck() {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    const alerts = [];
    for (const v of vehicles) {
      if (v.fuelLevelPercent !== null && v.fuelLevelPercent <= 0.2) {
        const recent = await getQuery(
          `SELECT id FROM alertas WHERE vehicle_id = ? AND tipo = 'combustible_bajo' AND timestamp > datetime('now', '-4 hours')`,
          [String(v.id)]
        );

        if (!recent) {
          const pct = Math.round(v.fuelLevelPercent * 100);
          await runQuery(
            'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad) VALUES (?, ?, ?, ?, ?)',
            [String(v.id), v.name, 'combustible_bajo', `${v.name} tiene ${pct}% de diesel - Nivel bajo`, 'alta']
          );
          alerts.push({ vehicle: v.name, fuel: pct });
        }
      }
    }

    return { checked: vehicles.length, newAlerts: alerts.length, alerts };
}

let fuelCheckInFlight = null;
function checkFuel() {
  if (!fuelCheckInFlight) {
    fuelCheckInFlight = performFuelCheck().finally(() => { fuelCheckInFlight = null; });
  }
  return fuelCheckInFlight;
}

app.post('/api/check-fuel', async (req, res) => {
  try {
    res.json(await checkFuel());
  } catch (error) {
    console.error('Error checking fuel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ VIAJES ============

function normalizeTripDelivery(body, current = null) {
  const has = key => Object.prototype.hasOwnProperty.call(body || {}, key);
  const tipoEntrega = has('tipo_entrega') ? body.tipo_entrega : (current?.tipo_entrega || 'directo');
  if (!['directo', 'reparto'].includes(tipoEntrega)) {
    throw new Error('tipo_entrega debe ser directo o reparto');
  }

  let suppliedDestinations;
  if (has('destinos')) {
    if (!Array.isArray(body.destinos)) throw new Error('destinos debe ser un arreglo');
    suppliedDestinations = body.destinos;
  } else if (current?.destinos_json) {
    try {
      suppliedDestinations = JSON.parse(current.destinos_json);
    } catch {
      suppliedDestinations = [];
    }
  } else {
    suppliedDestinations = [];
  }
  if (!Array.isArray(suppliedDestinations)) throw new Error('destinos debe ser un arreglo');

  const destinos = suppliedDestinations.map(value => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('destinos no puede contener valores vacíos');
    return value.trim().replace(/\s+/g, ' ');
  });
  if (new Set(destinos.map(normalizeDestination)).size !== destinos.length) {
    throw new Error('destinos debe contener destinos distintos');
  }

  if (tipoEntrega === 'reparto') {
    if (destinos.length < 2) throw new Error('reparto requiere al menos 2 destinos');
    return { tipo_entrega: tipoEntrega, destinos_json: JSON.stringify(destinos), destino: destinos[destinos.length - 1] };
  }

  if (destinos.length > 1) throw new Error('directo admite máximo un destino');
  const legacyDestination = has('destino') ? body.destino : (destinos[0] ?? current?.destino);
  if (legacyDestination !== null && legacyDestination !== undefined && typeof legacyDestination !== 'string') {
    throw new Error('destino debe ser texto');
  }
  const destino = typeof legacyDestination === 'string' ? legacyDestination.trim().replace(/\s+/g, ' ') : legacyDestination;
  return { tipo_entrega: tipoEntrega, destinos_json: JSON.stringify(destino ? [destino] : []), destino };
}

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
  const { vehicle_id, vehicle_name, origen, conductor, telefono, fecha_inicio, fecha_fin, notas } = req.body;
  let delivery;
  try {
    delivery = normalizeTripDelivery(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  db.run(
    'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, origen, delivery.destino, delivery.tipo_entrega, delivery.destinos_json, conductor, telefono || '', req.body.remolque || '', fecha_inicio, fecha_fin, notas],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/viajes/:id', (req, res) => {
  db.get('SELECT * FROM viajes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Viaje no encontrado' });

    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    let delivery = { tipo_entrega: row.tipo_entrega, destinos_json: row.destinos_json, destino: row.destino };
    if (has('tipo_entrega') || has('destinos') || has('destino')) {
      try {
        delivery = normalizeTripDelivery(req.body, row);
      } catch (deliveryErr) {
        return res.status(400).json({ error: deliveryErr.message });
      }
    }
    const next = {
      vehicle_id: has('vehicle_id') ? req.body.vehicle_id : row.vehicle_id,
      vehicle_name: has('vehicle_name') ? req.body.vehicle_name : row.vehicle_name,
      origen: has('origen') ? req.body.origen : row.origen,
      destino: delivery.destino,
      tipo_entrega: delivery.tipo_entrega,
      destinos_json: delivery.destinos_json,
      conductor: has('conductor') ? req.body.conductor : row.conductor,
      telefono: has('telefono') ? req.body.telefono : row.telefono,
      fecha_inicio: has('fecha_inicio') ? req.body.fecha_inicio : row.fecha_inicio,
      fecha_fin: has('fecha_fin') ? req.body.fecha_fin : row.fecha_fin,
      notas: has('notas') ? req.body.notas : row.notas,
      estado: has('estado') ? req.body.estado : row.estado,
      remolque: has('remolque') ? req.body.remolque : row.remolque,
    };

    db.run(
      'UPDATE viajes SET vehicle_id = ?, vehicle_name = ?, origen = ?, destino = ?, tipo_entrega = ?, destinos_json = ?, conductor = ?, telefono = ?, fecha_inicio = ?, fecha_fin = ?, notas = ?, estado = ?, remolque = ? WHERE id = ?',
      [next.vehicle_id, next.vehicle_name, next.origen, next.destino, next.tipo_entrega, next.destinos_json, next.conductor, next.telefono, next.fecha_inicio, next.fecha_fin, next.notas, next.estado, next.remolque, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
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

app.delete('/api/alertas', requireAdmin, (req, res) => {
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
  db.get('SELECT * FROM pendientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      titulo: has('titulo') ? req.body.titulo : row.titulo,
      descripcion: has('descripcion') ? req.body.descripcion : row.descripcion,
      prioridad: has('prioridad') ? req.body.prioridad : row.prioridad,
      estado: has('estado') ? req.body.estado : row.estado,
      asignado_a: has('asignado_a') ? req.body.asignado_a : row.asignado_a,
      turno: has('turno') ? req.body.turno : row.turno,
      notas: has('notas') ? req.body.notas : row.notas,
    };
    db.run(
      'UPDATE pendientes SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, asignado_a = ?, turno = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [next.titulo, next.descripcion, next.prioridad, next.estado, next.asignado_a, next.turno, next.notas, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
});

app.delete('/api/pendientes/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      await tx.run('DELETE FROM comentarios_pendientes WHERE pendiente_id = ?', [req.params.id]);
      const result = await tx.run('DELETE FROM pendientes WHERE id = ?', [req.params.id]);
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  db.run('DELETE FROM comentarios_pendientes WHERE id = ? AND pendiente_id = ?', [req.params.comentarioId, req.params.id], function (err) {
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

app.post('/api/pendientes/archivar-completados', requireAdmin, async (req, res) => {
  try {
    const archivedByUserId = req.user?.id || null;
    const archivedByUsername = actorFromReq(req);
    const archived = await withTransaction(async tx => {
      const rows = await tx.all('SELECT * FROM pendientes WHERE estado = "completado" ORDER BY fecha_actualizacion DESC');
      if (!rows.length) return 0;
      for (const row of rows) {
        const comments = await tx.all('SELECT autor, contenido FROM comentarios_pendientes WHERE pendiente_id = ? ORDER BY fecha_creacion ASC', [row.id]);
        await tx.run(`
          INSERT INTO pendientes_historial (
            pendiente_id, titulo, descripcion, prioridad, estado, asignado_a, turno, notas,
            creado_por, created_by_user_id, created_by_username, fecha_creacion, fecha_actualizacion,
            archived_by_user_id, archived_by_username, comentarios_resumen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id, row.titulo, row.descripcion || '', row.prioridad || 'media', row.estado || 'completado',
          row.asignado_a || '', row.turno || '', row.notas || '', row.creado_por || '',
          row.created_by_user_id || null, row.created_by_username || '', row.fecha_creacion || null,
          row.fecha_actualizacion || null, archivedByUserId, archivedByUsername,
          comments.map(c => `${c.autor || 'Sistema'}: ${c.contenido}`).join('\n'),
        ]);
      }
      const ids = rows.map(row => row.id);
      const placeholders = ids.map(() => '?').join(',');
      await tx.run(`DELETE FROM comentarios_pendientes WHERE pendiente_id IN (${placeholders})`, ids);
      const deleted = await tx.run(`DELETE FROM pendientes WHERE id IN (${placeholders}) AND estado = 'completado'`, ids);
      if (deleted.changes !== ids.length) throw new Error('Los pendientes cambiaron durante el archivado');
      return deleted.changes;
    });

    res.json({ archived });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reportes/pendientes-completados', (req, res) => {
  db.all('SELECT * FROM pendientes_historial ORDER BY archived_at DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/reportes/notas', (req, res) => {
  const { tipo, vehicle_id, fecha_inicio, fecha_fin } = req.query;
  let query = "SELECT * FROM comentarios WHERE tipo IN ('bitacora', 'incidencia', 'seguimiento', 'mantenimiento', 'incidente')";
  const params = [];
  if (tipo) { query += ' AND tipo = ?'; params.push(tipo); }
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (fecha_inicio) { query += ' AND created_at >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND created_at <= ?'; params.push(fecha_fin + ' 23:59:59'); }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
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
  db.get('SELECT * FROM comentarios WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      titulo: has('titulo') ? req.body.titulo : row.titulo,
      contenido: has('contenido') ? req.body.contenido : row.contenido,
      tipo: has('tipo') ? req.body.tipo : row.tipo,
    };
    db.run(
      'UPDATE comentarios SET titulo = ?, contenido = ?, tipo = ? WHERE id = ?',
      [next.titulo, next.contenido, next.tipo, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
});

app.delete('/api/comentarios/:id', (req, res) => {
  db.run('DELETE FROM comentarios WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/reportes/seguimiento', (req, res) => {
  const { vehicle_id, unidad, fecha_inicio, fecha_fin } = req.query;
  let query = `SELECT id, unidad, grupo, remolque, operador, origen, destino, ruta,
                      cita_carga, cita_descarga, hora_llegada, hora_liberacion,
                      estatus, comentarios_cliente, comentarios_monitoreo, fecha_actualizacion
               FROM seguimiento WHERE 1=1`;
  const params = [];
  if (unidad) {
    query += ' AND LOWER(unidad) = LOWER(?)';
    params.push(unidad);
  } else if (vehicle_id) {
    query += ` AND unidad IN (
      SELECT vehicle_name FROM vehicle_locations WHERE vehicle_id = ?
      UNION SELECT vehicle_name FROM viajes WHERE vehicle_id = ?
    )`;
    params.push(vehicle_id, vehicle_id);
  }
  if (fecha_inicio) {
    query += ' AND fecha_actualizacion >= ?';
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    query += " AND fecha_actualizacion < datetime(?, '+1 day')";
    params.push(fecha_fin);
  }
  query += ' ORDER BY unidad COLLATE NOCASE ASC, id ASC';
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
  if (fecha_fin) { query += " AND fecha_creacion < datetime(?, '+1 day')"; params.push(fecha_fin); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reportes/viajes', (req, res) => {
  const { fecha_inicio, fecha_fin, estado } = req.query;
  let query = 'SELECT * FROM viajes WHERE 1=1';
  const params = [];
  if (fecha_inicio) { query += ' AND (fecha_fin IS NULL OR fecha_fin >= ?)'; params.push(fecha_inicio); }
  if (fecha_fin) { query += " AND fecha_inicio < datetime(?, '+1 day')"; params.push(fecha_fin); }
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

app.delete('/api/route-history', requireAdmin, (req, res) => {
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

function detectVehicleStops(rows, minimumMinutes) {
  const minimumMs = minimumMinutes * 60 * 1000;
  const maximumGapMs = 30 * 60 * 1000;
  const maximumRadiusMeters = 250;
  const stops = [];
  let candidate = null;

  const finishCandidate = () => {
    if (!candidate || candidate.endedAt - candidate.startedAt < minimumMs) {
      candidate = null;
      return;
    }
    stops.push({
      id: candidate.id,
      vehicle_id: candidate.vehicleId,
      vehicle_name: candidate.vehicleName,
      latitude: candidate.latitudeSum / candidate.samples,
      longitude: candidate.longitudeSum / candidate.samples,
      speed: 0,
      heading: candidate.heading,
      location: candidate.location,
      source_time_ms: candidate.startedAt,
      recorded_at: new Date(candidate.startedAt).toISOString(),
      stop_ended_at: new Date(candidate.endedAt).toISOString(),
      stop_duration_minutes: Math.round((candidate.endedAt - candidate.startedAt) / 60000),
      is_stop: true,
    });
    candidate = null;
  };

  for (const row of rows) {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    const timestamp = Number(row.source_time_ms);
    const speedKmh = Math.abs(Number(row.speed) || 0) * 1.609344;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(timestamp) || speedKmh >= 1) {
      finishCandidate();
      continue;
    }

    if (candidate) {
      const centerLatitude = candidate.latitudeSum / candidate.samples;
      const centerLongitude = candidate.longitudeSum / candidate.samples;
      const gapMs = timestamp - candidate.endedAt;
      const distance = haversineDistance(centerLatitude, centerLongitude, latitude, longitude);
      if (gapMs < 0 || gapMs > maximumGapMs || distance > maximumRadiusMeters) finishCandidate();
    }

    if (!candidate) {
      candidate = {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicleName: row.vehicle_name,
        latitudeSum: latitude,
        longitudeSum: longitude,
        samples: 1,
        heading: row.heading,
        location: row.location,
        startedAt: timestamp,
        endedAt: timestamp,
      };
    } else {
      candidate.latitudeSum += latitude;
      candidate.longitudeSum += longitude;
      candidate.samples += 1;
      candidate.endedAt = timestamp;
      if (row.location) candidate.location = row.location;
    }
  }
  finishCandidate();
  return stops;
}

app.get('/api/route-history/last', (req, res) => {
  const { vehicle_id, hours, stops_minutes: stopsMinutes, since_ms: sinceMs, include_route: includeRouteValue } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  const h = Math.min(168, Math.max(1, Number(hours) || 24));
  const minimumStopMinutes = stopsMinutes === undefined ? null : Math.min(1440, Math.max(1, Number(stopsMinutes) || 20));
  const includeRoute = includeRouteValue === '1' || includeRouteValue === 'true';
  const earliestAllowed = Date.now() - 168 * 60 * 60 * 1000;
  const requestedSince = Number(sinceMs);
  const lowerBoundMs = Number.isFinite(requestedSince) && requestedSince > 0
    ? Math.max(earliestAllowed, Math.min(Date.now(), requestedSince))
    : Date.now() - h * 60 * 60 * 1000;
  const select = minimumStopMinutes
    ? `SELECT MIN(id) AS id, vehicle_id, MAX(vehicle_name) AS vehicle_name,
              AVG(latitude) AS latitude, AVG(longitude) AS longitude,
              MAX(ABS(COALESCE(speed, 0))) AS speed, MAX(heading) AS heading,
              MAX(location) AS location, MIN(source_time_ms) AS source_time_ms
       FROM route_history
       WHERE vehicle_id = ? AND source_time_ms IS NOT NULL
         AND source_time_ms >= ?
       GROUP BY CAST(source_time_ms / 60000 AS INTEGER)
       ORDER BY source_time_ms ASC`
    : `SELECT * FROM route_history
       WHERE vehicle_id = ? AND recorded_at >= datetime('now', '-' || ? || ' hours')
       ORDER BY recorded_at ASC`;
  db.all(
    select,
    [vehicle_id, minimumStopMinutes ? lowerBoundMs : h],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!minimumStopMinutes) return res.json(rows || []);
      const stops = detectVehicleStops(rows || [], minimumStopMinutes);
      if (!includeRoute) return res.json(stops);
      const route = (rows || []).map(row => ({
        ...row,
        recorded_at: new Date(Number(row.source_time_ms)).toISOString(),
      }));
      res.json({ route, stops });
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

function normalizeClientPayload(body, current = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(body || {}, key);
  const text = (key, fallback = '') => {
    const value = has(key) ? body[key] : (current[key] ?? fallback);
    if (value !== null && value !== undefined && typeof value !== 'string') throw new Error(`${key} debe ser texto`);
    return String(value || '').trim().replace(/\s+/g, ' ');
  };
  const client = {
    nombre: text('nombre'),
    contacto: text('contacto'),
    telefono: text('telefono'),
    email: text('email').toLowerCase(),
  };
  if (!client.nombre) throw new Error('nombre es requerido');
  if (client.nombre.length > 150) throw new Error('nombre no puede exceder 150 caracteres');
  if (client.contacto.length > 150) throw new Error('contacto no puede exceder 150 caracteres');
  if (client.telefono.length > 40) throw new Error('telefono no puede exceder 40 caracteres');
  if (client.email.length > 254 || (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))) {
    throw new Error('email no es válido');
  }
  return client;
}

app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY nombre ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/clientes/geofence-links', (req, res) => {
  db.all('SELECT * FROM cliente_geofence_links ORDER BY created_at ASC, id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(row);
  });
});

app.post('/api/clientes', (req, res) => {
  let client;
  try {
    client = normalizeClientPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  db.run('INSERT INTO clientes (nombre, contacto, telefono, email) VALUES (?, ?, ?, ?)', [client.nombre, client.contacto, client.telefono, client.email], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.status(201).json(row);
    });
  });
});

app.put('/api/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    let client;
    try {
      client = normalizeClientPayload(req.body, row);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    db.run(
      'UPDATE clientes SET nombre = ?, contacto = ?, telefono = ?, email = ? WHERE id = ?',
      [client.nombre, client.contacto, client.telefono, client.email, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (getErr, updated) => {
          if (getErr) return res.status(500).json({ error: getErr.message });
          res.json(updated);
        });
      }
    );
  });
});

app.post('/api/clientes/:id/geofences/link', async (req, res) => {
  const source = String(req.body?.source || '').toLowerCase();
  const geofenceRef = String(req.body?.geofence_id ?? '').trim();
  if (!['local', 'samsara'].includes(source) || !geofenceRef) {
    return res.status(400).json({ error: 'source y geofence_id son requeridos' });
  }
  try {
    const client = await getQuery('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    if (source === 'local') {
      const geofence = await getQuery('SELECT id, nombre, cliente_id FROM geofences WHERE id = ?', [geofenceRef]);
      if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });
      if (geofence.cliente_id && String(geofence.cliente_id) !== String(client.id)) {
        return res.status(409).json({ error: 'La geocerca ya está asociada a otro cliente' });
      }
      await runQuery('UPDATE geofences SET cliente_id = ? WHERE id = ?', [client.id, geofence.id]);
      return res.json({ cliente_id: client.id, source, geofence_ref: String(geofence.id), geofence_nombre: geofence.nombre });
    }

    const addresses = await fetchSamsaraAddresses();
    const geofence = addresses.find(address => String(address.id) === geofenceRef);
    if (!geofence) return res.status(404).json({ error: 'Geocerca Samsara no encontrada' });
    const existing = await getQuery('SELECT * FROM cliente_geofence_links WHERE source = ? AND geofence_ref = ?', [source, geofenceRef]);
    if (existing && String(existing.cliente_id) !== String(client.id)) {
      return res.status(409).json({ error: 'La geocerca ya está asociada a otro cliente' });
    }
    if (!existing) {
      await runQuery(
        'INSERT INTO cliente_geofence_links (cliente_id, source, geofence_ref, geofence_nombre) VALUES (?, ?, ?, ?)',
        [client.id, source, geofenceRef, geofence.nombre]
      );
    }
    res.json(await getQuery('SELECT * FROM cliente_geofence_links WHERE source = ? AND geofence_ref = ?', [source, geofenceRef]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id/geofences/:source/:geofenceRef', async (req, res) => {
  const source = String(req.params.source || '').toLowerCase();
  try {
    if (source === 'local') {
      const result = await runQuery('UPDATE geofences SET cliente_id = NULL WHERE id = ? AND cliente_id = ?', [req.params.geofenceRef, req.params.id]);
      return res.json({ unlinked: result.changes });
    }
    if (source !== 'samsara') return res.status(400).json({ error: 'Fuente de geocerca inválida' });
    const result = await runQuery(
      'DELETE FROM cliente_geofence_links WHERE cliente_id = ? AND source = ? AND geofence_ref = ?',
      [req.params.id, source, req.params.geofenceRef]
    );
    res.json({ unlinked: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', (req, res) => {
  withTransaction(async tx => {
    await tx.run('UPDATE geofences SET cliente_id = NULL WHERE cliente_id = ?', [req.params.id]);
    await tx.run('DELETE FROM cliente_geofence_links WHERE cliente_id = ?', [req.params.id]);
    return tx.run('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  }).then(result => {
    if (!result.changes) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ deleted: result.changes });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// ============ REMOLQUES ============

app.get('/api/remolques', (req, res) => {
  db.all(`SELECT r.*,
    (SELECT ra.vehicle_name FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as unidad_asignada,
    (SELECT ra.vehicle_id FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as vehicle_id_asignado,
    (SELECT ra.tipo_asignacion FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as tipo_asignacion,
    (SELECT ra.grupo_full FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as grupo_full
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

app.post('/api/remolques/full/asignar', async (req, res) => {
  const { remolque_ids, vehicle_id, vehicle_name } = req.body || {};
  if (!Array.isArray(remolque_ids) || remolque_ids.length !== 2) {
    return res.status(400).json({ error: 'remolque_ids debe contener exactamente dos remolques' });
  }
  const ids = remolque_ids.map(Number);
  if (ids.some(id => !Number.isInteger(id) || id <= 0) || ids[0] === ids[1]) {
    return res.status(400).json({ error: 'Los remolques deben ser distintos y válidos' });
  }
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  try {
    const full = await withTransaction(async tx => {
      const tanks = await tx.all(
        'SELECT id, numero, categoria, status FROM remolques WHERE id IN (?, ?) ORDER BY id',
        ids
      );
      if (tanks.length !== 2) {
        const error = new Error('Uno o más remolques no fueron encontrados');
        error.status = 404;
        throw error;
      }
      if (tanks.some(tank => String(tank.categoria || '').trim().toLowerCase() !== 'tanque')) {
        const error = new Error('Full requiere exactamente dos remolques de categoría Tanque');
        error.status = 400;
        throw error;
      }
      const activeElsewhere = await tx.get(
        'SELECT id FROM remolque_asignaciones WHERE activa = 1 AND remolque_id IN (?, ?) AND vehicle_id <> ? LIMIT 1',
        [ids[0], ids[1], vehicle_id]
      );
      if (activeElsewhere) {
        const error = new Error('Uno de los tanques ya está asignado a otra unidad');
        error.status = 409;
        throw error;
      }

      const displaced = await tx.all(
        'SELECT DISTINCT remolque_id FROM remolque_asignaciones WHERE activa = 1 AND vehicle_id = ?',
        [vehicle_id]
      );
      await tx.run(
        'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE activa = 1 AND vehicle_id = ?',
        [vehicle_id]
      );
      for (const row of displaced) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', row.remolque_id]);
      }

      const grupoFull = crypto.randomUUID();
      const assignments = [];
      for (const id of ids) {
        const result = await tx.run(
          `INSERT INTO remolque_asignaciones
             (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
           VALUES (?, ?, ?, 'full', ?)`,
          [id, vehicle_id, vehicle_name || '', grupoFull]
        );
        assignments.push(result.lastID);
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['asignado', id]);
      }
      return {
        tipo_asignacion: 'full',
        grupo_full: grupoFull,
        vehicle_id,
        vehicle_name: vehicle_name || '',
        tanques: tanks.map(tank => ({ ...tank, status: 'asignado' })),
        asignacion_ids: assignments,
      };
    });
    res.json(full);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.delete('/api/remolques/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      const active = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      if (active?.grupo_full) {
        const members = await tx.all(
          'SELECT remolque_id FROM remolque_asignaciones WHERE grupo_full = ? AND activa = 1',
          [active.grupo_full]
        );
        await tx.run(
          'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE grupo_full = ? AND activa = 1',
          [active.grupo_full]
        );
        for (const member of members) {
          await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', member.remolque_id]);
        }
      }
      await tx.run(
        'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = COALESCE(fecha_fin, CURRENT_TIMESTAMP) WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      await tx.run('DELETE FROM remolque_asignaciones WHERE remolque_id = ?', [req.params.id]);
      const result = await tx.run('DELETE FROM remolques WHERE id = ?', [req.params.id]);
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/remolques/:id', (req, res) => {
  db.get('SELECT * FROM remolques WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const numero = has('numero') ? req.body.numero : row.numero;
    const categoria = has('categoria') ? req.body.categoria : row.categoria;
    if (!numero) return res.status(400).json({ error: 'numero es requerido' });
    db.run('UPDATE remolques SET numero = ?, categoria = ? WHERE id = ?', [String(numero).trim(), categoria || 'Caja Seca', req.params.id], function (runErr) {
      if (runErr) return res.status(500).json({ error: runErr.message });
      res.json({ changes: this.changes });
    });
  });
});

app.post('/api/remolques/:id/asignar', async (req, res) => {
  const { vehicle_id, vehicle_name } = req.body;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  try {
    const id = await withTransaction(async tx => {
      const trailer = await tx.get('SELECT id FROM remolques WHERE id = ?', [req.params.id]);
      if (!trailer) {
        const error = new Error('Remolque no encontrado');
        error.status = 404;
        throw error;
      }
      const current = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE activa = 1 AND remolque_id = ?',
        [req.params.id]
      );
      const displaced = await tx.all(
        `SELECT DISTINCT remolque_id FROM remolque_asignaciones
         WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
        [req.params.id, vehicle_id, current?.grupo_full || null, current?.grupo_full || null]
      );
      await tx.run(
        `UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP
         WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
        [req.params.id, vehicle_id, current?.grupo_full || null, current?.grupo_full || null]
      );
      for (const row of displaced) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', row.remolque_id]);
      }
      const result = await tx.run(
        `INSERT INTO remolque_asignaciones
           (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
         VALUES (?, ?, ?, 'sencillo', NULL)`,
        [req.params.id, vehicle_id, vehicle_name || '']
      );
      await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['asignado', req.params.id]);
      return result.lastID;
    });
    res.json({ id });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/remolques/:id/desasignar', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      const active = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      if (!active) return 0;
      const members = active.grupo_full
        ? await tx.all('SELECT remolque_id FROM remolque_asignaciones WHERE grupo_full = ? AND activa = 1', [active.grupo_full])
        : [{ remolque_id: req.params.id }];
      const result = active.grupo_full
        ? await tx.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE grupo_full = ? AND activa = 1', [active.grupo_full])
        : await tx.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE remolque_id = ? AND activa = 1', [req.params.id]);
      for (const member of members) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', member.remolque_id]);
      }
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/seguimiento/import', requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Array de registros requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  try {
    const imported = await withTransaction(async tx => {
      await tx.run('DELETE FROM seguimiento');
      for (const item of items) {
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
        await tx.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
      }
      return items.length;
    });
    res.json({ imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  db.get('SELECT * FROM unidades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      nombre: has('nombre') ? req.body.nombre : row.nombre,
      estatus: has('estatus') ? req.body.estatus : row.estatus,
      notas: has('notas') ? req.body.notas : row.notas,
      tipo: has('tipo') ? req.body.tipo : row.tipo,
      samsara_id: has('samsara_id') ? req.body.samsara_id : row.samsara_id,
    };
    db.run(
      `UPDATE unidades SET nombre = ?, estatus = ?, notas = ?, tipo = ?, samsara_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [next.nombre, next.estatus, next.notas, next.tipo, next.samsara_id || '', req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ updated: this.changes });
      }
    );
  });
});

app.delete('/api/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ AUTO-CHECK INTERVALS ============

const runAlertChecks = async () => {
  await checkGeofences();
  await checkFuel();
};

let liveSyncInFlight = null;
const runLiveSync = async () => {
  if (liveSyncInFlight) return liveSyncInFlight;
  liveSyncInFlight = (async () => {
    await refreshSamsaraVehicles();
    await runAlertChecks();
    broadcastLiveUpdate('reload', { source: 'scheduled-sync' });
  })().catch(error => {
    console.error('Error en sincronización programada:', error.message);
  }).finally(() => {
    liveSyncInFlight = null;
  });
  return liveSyncInFlight;
};

async function startServer() {
  await databaseReady;
  const foreignKeys = await getQuery('PRAGMA foreign_keys');
  if (!foreignKeys || Number(foreignKeys.foreign_keys) !== 1) {
    throw new Error('SQLite foreign keys no pudieron habilitarse');
  }
  await ensureDefaultAdmin();
  setTimeout(runLiveSync, 10000);
  setInterval(runLiveSync, 60000);
  app.listen(PORT, () => {
    console.log(`Servidor GERS corriendo en puerto ${PORT}`);
  });
}

startServer().catch(error => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exitCode = 1;
});
