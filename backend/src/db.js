const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { DB_PATH: dbPath, DB_DIR: dbDir } = require('./config');

if (!fs.existsSync(dbDir)) { fs.mkdirSync(dbDir, { recursive: true }); }

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('Conectado a SQLite en', dbPath);
});
db.configure('busyTimeout', 10000);

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
    hora_llegada DATETIME,
    hora_salida DATETIME,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE viajes ADD COLUMN telefono TEXT", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN remolque TEXT", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN tipo_entrega TEXT DEFAULT 'directo'", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN destinos_json TEXT DEFAULT '[]'", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN estado_previo TEXT", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN updated_at DATETIME", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN hora_llegada DATETIME", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN hora_salida DATETIME", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN cita_programada DATETIME", [], () => {});
  db.run('UPDATE viajes SET cita_programada = fecha_fin WHERE cita_programada IS NULL AND fecha_fin IS NOT NULL', [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN hora_llegada DATETIME", [], () => {});
  db.run("ALTER TABLE viajes ADD COLUMN hora_salida DATETIME", [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS viaje_paradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viaje_id INTEGER NOT NULL,
    orden INTEGER NOT NULL,
    destino TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    hora_llegada DATETIME,
    hora_salida DATETIME,
    hora_programada DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(viaje_id, orden),
    FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
  )`);
  db.run("ALTER TABLE viaje_paradas ADD COLUMN hora_programada DATETIME", [], () => {});
  db.run('CREATE INDEX IF NOT EXISTS idx_viaje_paradas_viaje_estado ON viaje_paradas(viaje_id, estado)', [], () => {});

  db.run(`CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    tipo TEXT,
    mensaje TEXT,
    severidad TEXT DEFAULT 'info',
    leida INTEGER DEFAULT 0,
    archivada INTEGER DEFAULT 0,
    archived_at DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run('ALTER TABLE alertas ADD COLUMN archivada INTEGER DEFAULT 0', [], () => {});
  db.run('ALTER TABLE alertas ADD COLUMN archived_at DATETIME', [], () => {});
  db.run('CREATE INDEX IF NOT EXISTS idx_alertas_archivada_timestamp ON alertas(archivada, timestamp)', [], () => {});

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

  db.run(`CREATE TABLE IF NOT EXISTS trailer_locations (
    trailer_id TEXT PRIMARY KEY,
    trailer_name TEXT,
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
    driver_id_samsara TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE vehicle_operators ADD COLUMN telefono TEXT", [], () => {});
  db.run("ALTER TABLE vehicle_operators ADD COLUMN driver_id_samsara TEXT", [], () => {});

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
  db.run("ALTER TABLE clientes ADD COLUMN wpp_groups TEXT", [], () => {});

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
    tipo_entrega TEXT DEFAULT 'directo',
    destinos_json TEXT,
    url TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run("ALTER TABLE mapas_mymaps ADD COLUMN tipo_entrega TEXT DEFAULT 'directo'", [], () => {});
  db.run('ALTER TABLE mapas_mymaps ADD COLUMN destinos_json TEXT', [], () => {});
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

module.exports = { db, dbPath, dbDir, databaseReady, runQuery, getQuery, allQuery, withTransaction };
