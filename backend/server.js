require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'gers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('Conectado a SQLite en', dbPath);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    vehicle_name TEXT,
    origen TEXT,
    destino TEXT,
    conductor TEXT,
    estado TEXT DEFAULT 'programado',
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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

  db.run(`CREATE TABLE IF NOT EXISTS operaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT DEFAULT 'pendiente',
    origen TEXT,
    destino TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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

  db.run(`CREATE INDEX IF NOT EXISTS idx_route_history_vehicle_time ON route_history (vehicle_id, recorded_at)`);
});

const samsaraApi = axios.create({
  baseURL: 'https://api.samsara.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
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
  const { operator_name } = req.body;
  db.run(
    `INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(vehicle_id) DO UPDATE SET operator_name = ?, updated_at = datetime('now')`,
    [req.params.vehicleId, req.body.vehicle_name || null, operator_name, operator_name],
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
      if (v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25) {
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
  db.all('SELECT * FROM viajes ORDER BY fecha_inicio ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/viajes', (req, res) => {
  const { vehicle_id, vehicle_name, origen, destino, conductor, fecha_inicio, fecha_fin, notas } = req.body;
  db.run(
    'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, conductor, fecha_inicio, fecha_fin, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, origen, destino, conductor, fecha_inicio, fecha_fin, notas],
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

// ============ OPERACIONES ============

app.get('/api/operaciones', (req, res) => {
  db.all('SELECT * FROM operaciones', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/operaciones', (req, res) => {
  const { codigo, descripcion, origen, destino } = req.body;
  db.run(
    'INSERT INTO operaciones (codigo, descripcion, origen, destino) VALUES (?, ?, ?, ?)',
    [codigo, descripcion, origen, destino],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/operaciones/:id', (req, res) => {
  const { estado } = req.body;
  db.run('UPDATE operaciones SET estado = ? WHERE id = ?', [estado, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
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
  const { vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje } = req.body;
  db.run(
    'INSERT INTO comentarios (vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, autor || 'Sistema', tipo || 'seguimiento', titulo || null, contenido, kilometraje || null],
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
  let query = 'SELECT * FROM comentarios WHERE 1=1';
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
  db.get('SELECT COUNT(*) as total FROM operaciones', [], (err, row) => {
    stats.totalOperaciones = row?.total || 0;
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

app.get('/api/reportes/operaciones', (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let query = 'SELECT * FROM operaciones WHERE 1=1';
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
