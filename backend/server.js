require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

const { PORT, allowedOrigins, IS_PRODUCTION, TRIP_ROUTE_STATES, TRIP_TRAILER_ACTIVE_STATES, SESSION_DAYS } = require('./src/config');
const { db, databaseReady, runQuery, getQuery, allQuery, withTransaction } = require('./src/db');
const { broadcastLiveUpdate, liveClients } = require('./src/cache');
const { requireAuth, requireAdmin, actorFromReq } = require('./src/auth');
const { hashPassword, verifyPassword, createSessionToken, getUserByToken, refreshSession, ensureDefaultAdmin } = require('./src/models/users');
const { createAlertRecord } = require('./src/models/alertas');
const { parseFechaLocal, localTimestampISO } = require('./src/utils');

const {
  fetchSamsaraDrivers, syncOperatorToSamsara, fetchSamsaraAddresses,
  fetchSamsaraTrailerLocations, getTrailerTempsCached, mapTrailerTemp,
  performSamsaraTrailerRefresh, loadTrailerLocationsCache, mapTrailerLocation,
  refreshSamsaraVehicles,
} = require('./src/services/samsara');
const { checkGeofences, haversineDistance, resetTripGeofenceState, markInitialGeofenceContact, handleSamsaraWebhook } = require('./src/services/geofences');
const { calculateRoute, validMyMapsUrl } = require('./src/services/geocode');
const { checkFuel, checkMantenimiento, mantenimientoStatus, runAlertChecks } = require('./src/services/checks');
const { normalizeTripDelivery, syncTripStops, attachTripStops, syncTripTrailer } = require('./src/services/viajes');
const { computePuntualidadKpi, computeViajesSemanaKpi, computeUsoFlotaKpi, computeCitasHoyKpi, computeRemolquesKpi } = require('./src/services/kpi');
const { getTurnoSummary } = require('./src/services/turnos');
const { listBackupDetails, performDatabaseBackup } = require('./src/services/backup');

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

app.get('/api/kpis', async (req, res) => {
  try {
    const start = Date.now();

    const [puntualidad, viajesSemanas, usoFlota, citasHoy, remolquesKpi] = await Promise.all([
      computePuntualidadKpi(),
      computeViajesSemanaKpi(),
      computeUsoFlotaKpi(),
      computeCitasHoyKpi(),
      computeRemolquesKpi(),
    ]);

    res.json({
      puntualidad,
      viajesPorSemana: viajesSemanas,
      usoFlota,
      citasHoy,
      remolques: remolquesKpi,
      computadoEnMs: Date.now() - start,
    });
  } catch (err) {
    console.error('Error al calcular KPIs:', err);
    res.status(500).json({ error: 'Error al calcular KPIs' });
  }
});


app.post('/api/calculate-route', async (req, res) => {
  try {
    res.json(await calculateRoute(req.body || {}));
  } catch (error) {
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error al calcular ruta:', error.message);
    res.status(502).json({ error: 'El servicio externo de rutas no está disponible' });
  }
});


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

app.put('/api/vehicle-operators/:vehicleId', async (req, res) => {
  try {
    const row = await getQuery('SELECT * FROM vehicle_operators WHERE vehicle_id = ?', [req.params.vehicleId]);
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      vehicle_name: has('vehicle_name') ? req.body.vehicle_name : (row?.vehicle_name || null),
      operator_name: has('operator_name') ? req.body.operator_name : (row?.operator_name || ''),
      telefono: has('telefono') ? req.body.telefono : (row?.telefono || ''),
      driver_id_samsara: has('driver_id_samsara') ? req.body.driver_id_samsara : (row?.driver_id_samsara || ''),
    };
    let result;
    if (row) {
      result = await runQuery(
        'UPDATE vehicle_operators SET vehicle_name = ?, operator_name = ?, telefono = ?, driver_id_samsara = ?, updated_at = datetime(\'now\') WHERE vehicle_id = ?',
        [next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara, req.params.vehicleId]
      );
    } else {
      result = await runQuery(
        'INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, telefono, driver_id_samsara, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
        [req.params.vehicleId, next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara]
      );
    }

    const syncPromise = syncOperatorToSamsara(req.params.vehicleId, next.operator_name, next.driver_id_samsara);
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, message: 'Tiempo de espera agotado al sincronizar con Samsara' }), 20000));
    const samsara_sync = await Promise.race([syncPromise, timeoutPromise]);
    if (!samsara_sync.ok && !samsara_sync.skipped) {
      console.error('Sync operador→Samsara falló:', samsara_sync.message);
    }

    res.json({ changes: result.changes, driver_id_samsara: next.driver_id_samsara, samsara_sync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SAMSARA DRIVERS ============


app.get('/api/samsara/drivers', async (req, res) => {
  try {
    const allDrivers = await fetchSamsaraDrivers();
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


app.post('/api/webhooks/samsara', async (req, res) => {
  try {
    res.json(await handleSamsaraWebhook(req));
  } catch (err) {
    console.error('Webhook Samsara inválido:', err.message);
    res.status(err.status || 400).json({ error: err.message });
  }
});


app.post('/api/check-geofences', async (req, res) => {
  try {
    res.json(await checkGeofences());
  } catch (error) {
    console.error('Error checking geofences:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ FUEL ALERTS ============

app.post('/api/check-fuel', async (req, res) => {
  try {
    res.json(await checkFuel());
  } catch (error) {
    console.error('Error checking fuel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ MANTENIMIENTO PREVENTIVO ============


app.post('/api/check-mantenimiento', async (req, res) => {
  try {
    res.json(await checkMantenimiento());
  } catch (error) {
    console.error('Error checking mantenimiento:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mantenimientos', async (req, res) => {
  try {
    const rows = await allQuery('SELECT * FROM mantenimientos ORDER BY CASE estado WHEN \'vencido\' THEN 0 WHEN \'proximo\' THEN 1 WHEN \'programado\' THEN 2 WHEN \'completado\' THEN 3 ELSE 4 END, fecha_proxima ASC');
    res.json(rows.map(m => ({ ...m, status: mantenimientoStatus(m) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mantenimientos', async (req, res) => {
  const { entidad_tipo = 'unidad', entidad_id = '', entidad_nombre = '', tipo_servicio = 'general', fecha_ultimo, fecha_proxima, intervalo_dias = 30, kilometraje_ultimo, kilometraje_proximo, estado = 'programado', notas = '' } = req.body || {};
  try {
    const result = await runQuery(
      `INSERT INTO mantenimientos (entidad_tipo, entidad_id, entidad_nombre, tipo_servicio, fecha_ultimo, fecha_proxima, intervalo_dias, kilometraje_ultimo, kilometraje_proximo, estado, notas, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entidad_tipo, String(entidad_id), String(entidad_nombre), String(tipo_servicio), fecha_ultimo || null, fecha_proxima || null, Number(intervalo_dias) || 30, kilometraje_ultimo || null, kilometraje_proximo || null, String(estado), String(notas), req.user?.username || '']
    );
    const row = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [result.lastID]);
    res.json({ ...row, status: mantenimientoStatus(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/mantenimientos/:id', async (req, res) => {
  const { estado, fecha_proxima, fecha_ultimo, notas, kilometraje_proximo, kilometraje_ultimo, intervalo_dias, tipo_servicio } = req.body || {};
  try {
    const row = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    const next = {
      estado: estado !== undefined ? String(estado) : row.estado,
      fecha_proxima: fecha_proxima !== undefined ? fecha_proxima : row.fecha_proxima,
      fecha_ultimo: fecha_ultimo !== undefined ? fecha_ultimo : row.fecha_ultimo,
      notas: notas !== undefined ? String(notas) : row.notas,
      kilometraje_proximo: kilometraje_proximo !== undefined ? kilometraje_proximo : row.kilometraje_proximo,
      kilometraje_ultimo: kilometraje_ultimo !== undefined ? kilometraje_ultimo : row.kilometraje_ultimo,
      intervalo_dias: intervalo_dias !== undefined ? Number(intervalo_dias) : row.intervalo_dias,
      tipo_servicio: tipo_servicio !== undefined ? String(tipo_servicio) : row.tipo_servicio,
    };
    if (estado === 'completado' && !fecha_ultimo) {
      next.fecha_ultimo = new Date().toISOString();
    }
    if (estado === 'completado' && !fecha_proxima && next.intervalo_dias) {
      const base = parseFechaLocal(next.fecha_ultimo) || new Date();
      const prox = new Date(base);
      prox.setDate(prox.getDate() + Number(next.intervalo_dias));
      next.fecha_proxima = prox.toISOString();
    }
    await runQuery(
      'UPDATE mantenimientos SET estado = ?, fecha_proxima = ?, fecha_ultimo = ?, notas = ?, kilometraje_proximo = ?, kilometraje_ultimo = ?, intervalo_dias = ?, tipo_servicio = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [next.estado, next.fecha_proxima, next.fecha_ultimo, next.notas, next.kilometraje_proximo, next.kilometraje_ultimo, next.intervalo_dias, next.tipo_servicio, req.params.id]
    );
    const updated = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [req.params.id]);
    res.json({ ...updated, status: mantenimientoStatus(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/mantenimientos/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM mantenimientos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/viajes', async (req, res) => {
  try {
    const rows = await allQuery(`SELECT * FROM viajes ORDER BY
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
    COALESCE(fecha_inicio, created_at) ASC`);
    res.json(await attachTripStops(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/viajes', async (req, res) => {
  const { vehicle_id, vehicle_name, origen, conductor, telefono, fecha_inicio, fecha_fin, notas } = req.body;
  let delivery;
  try {
    delivery = normalizeTripDelivery(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const result = await runQuery(
      'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, cita_programada, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [vehicle_id, vehicle_name, origen, delivery.destino, delivery.tipo_entrega, delivery.destinos_json, conductor, telefono || '', req.body.remolque || '', fecha_inicio, fecha_fin, fecha_fin, notas]
    );
    const trip = await getQuery('SELECT * FROM viajes WHERE id = ?', [result.lastID]);
    const paradas = await syncTripStops(trip);
    const contactoInicial = await markInitialGeofenceContact(trip).catch(error => {
      console.error('Error marcando contacto inicial de geocerca:', error.message);
      return [];
    });
    res.json({ id: result.lastID, paradas, contactoInicial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/viajes/:id', async (req, res) => {
  try {
    const row = await getQuery('SELECT * FROM viajes WHERE id = ?', [req.params.id]);
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
      cita_programada: has('fecha_fin') ? req.body.fecha_fin : row.fecha_fin,
      notas: has('notas') ? req.body.notas : row.notas,
      estado: has('estado') ? req.body.estado : row.estado,
      remolque: has('remolque') ? req.body.remolque : row.remolque,
    };

    const result = await runQuery(
      'UPDATE viajes SET vehicle_id = ?, vehicle_name = ?, origen = ?, destino = ?, tipo_entrega = ?, destinos_json = ?, conductor = ?, telefono = ?, fecha_inicio = ?, fecha_fin = ?, cita_programada = ?, notas = ?, estado = ?, remolque = ? WHERE id = ?',
      [next.vehicle_id, next.vehicle_name, next.origen, next.destino, next.tipo_entrega, next.destinos_json, next.conductor, next.telefono, next.fecha_inicio, next.fecha_fin, next.cita_programada, next.notas, next.estado, next.remolque, req.params.id]
    );
    const paradas = await syncTripStops({ id: Number(req.params.id), ...next }, has('tipo_entrega') || has('destinos') || has('destino'));
    let trailerSync = null;
    const nuevoEstado = String(next.estado || '').toLowerCase();
    if (TRIP_ROUTE_STATES.has(nuevoEstado)) {
      await resetTripGeofenceState(next);
    }
    const estadoPrevio = String(row.estado || '').toLowerCase();
    const viajeActivoPrevio = TRIP_TRAILER_ACTIVE_STATES.has(estadoPrevio);
    if (!viajeActivoPrevio && TRIP_TRAILER_ACTIVE_STATES.has(nuevoEstado) && (next.remolque || row.remolque)) {
      try {
        trailerSync = await syncTripTrailer({ ...next, remolque: next.remolque || row.remolque });
      } catch (syncErr) {
        if (syncErr.status === 409) return res.status(409).json({ error: syncErr.message });
        console.error('Error sincronizando remolque del viaje:', syncErr.message);
      }
    }
    res.json({ changes: result.changes, paradas, trailerSync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/viajes/:id/paradas/:paradaId', async (req, res) => {
  const estado = String(req.body?.estado || '').toLowerCase();
  if (!['pendiente', 'en_camino', 'llego', 'completada', 'omitida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de parada inválido' });
  }
  try {
    await withTransaction(async tx => {
      const stop = await tx.get('SELECT * FROM viaje_paradas WHERE id = ? AND viaje_id = ?', [req.params.paradaId, req.params.id]);
      if (!stop) throw Object.assign(new Error('Parada no encontrada'), { status: 404 });
      const now = localTimestampISO(new Date());
      const arrival = ['llego', 'completada'].includes(estado) ? (stop.hora_llegada || now) : stop.hora_llegada;
      const departure = ['completada', 'omitida'].includes(estado) ? now : stop.hora_salida;
      await tx.run(
        'UPDATE viaje_paradas SET estado = ?, hora_llegada = ?, hora_salida = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [estado, arrival || null, departure || null, stop.id]
      );
      if (['completada', 'omitida'].includes(estado)) {
        const nextStop = await tx.get("SELECT id FROM viaje_paradas WHERE viaje_id = ? AND orden > ? AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1", [stop.viaje_id, stop.orden]);
        if (nextStop) await tx.run("UPDATE viaje_paradas SET estado = 'en_camino', updated_at = datetime('now') WHERE id = ?", [nextStop.id]);
      }
    });
    res.json({ paradas: await allQuery('SELECT * FROM viaje_paradas WHERE viaje_id = ? ORDER BY orden ASC', [req.params.id]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.delete('/api/viajes/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      await tx.run('DELETE FROM viaje_paradas WHERE viaje_id = ?', [req.params.id]);
      return (await tx.run('DELETE FROM viajes WHERE id = ?', [req.params.id])).changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ALERTAS ============

app.get('/api/alertas', (req, res) => {
  const archived = req.query.archivadas === '1' || req.query.archivadas === 'true';
  const all = req.query.todas === '1' || req.query.todas === 'true';
  const query = `SELECT * FROM alertas${all ? '' : ' WHERE COALESCE(archivada, 0) = ?'} ORDER BY timestamp DESC`;
  db.all(query, all ? [] : [archived ? 1 : 0], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/alertas', async (req, res) => {
  const { vehicle_id, vehicle_name, tipo, mensaje, severidad } = req.body;
  try {
    const alert = await createAlertRecord({
      vehicle_id,
      vehicle_name,
      tipo: tipo || 'alerta',
      mensaje: mensaje || '',
      severidad: severidad || 'info',
    });
    res.json({ id: alert.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/alertas/:id/leer', (req, res) => {
  db.run('UPDATE alertas SET leida = 1 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/alertas/archivar-todas', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE COALESCE(archivada, 0) = 0", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ archived: this.changes });
  });
});

app.put('/api/alertas/:id/archivar', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json({ archived: this.changes });
  });
});

app.put('/api/alertas/:id/restaurar', (req, res) => {
  db.run('UPDATE alertas SET archivada = 0, archived_at = NULL WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json({ restored: this.changes });
  });
});

app.delete('/api/alertas/:id', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/alertas', requireAdmin, (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE COALESCE(archivada, 0) = 0", [], function (err) {
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
        db.get('SELECT COUNT(*) as total FROM alertas WHERE leida = 0 AND COALESCE(archivada, 0) = 0', [], (err, row) => {
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

app.get('/api/viajes/activos', async (req, res) => {
  try {
    const rows = await allQuery(
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
       COALESCE(v.fecha_inicio, v.created_at) ASC`
    );
    res.json(await attachTripStops(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CLIENTES ============

function parseWppGroups(value) {
  let raw = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) raw = parsed;
    } catch (error) {
      raw = [];
    }
  }
  return raw
    .map(item => typeof item === 'string' ? item : (item?.nombre ?? ''))
    .map(item => String(item || '').trim())
    .filter(Boolean);
}

function normalizeWppGroups(value, current = []) {
  if (value === undefined || value === null) return current;
  if (!Array.isArray(value)) throw new Error('wpp_groups debe ser una lista de grupos');
  const grupos = value.map((item, index) => {
    const nombre = typeof item === 'string' ? item : item?.nombre;
    const limpio = String(nombre ?? '').trim().replace(/\s+/g, ' ');
    if (!limpio) throw new Error(`Grupo de WPP ${index + 1} requiere nombre`);
    if (limpio.length > 150) throw new Error(`Grupo de WPP ${index + 1}: el nombre es muy largo`);
    return limpio;
  });
  return [...new Set(grupos)];
}

function serializeCliente(row) {
  return { ...row, wpp_groups: parseWppGroups(row?.wpp_groups) };
}

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
    wpp_groups: JSON.stringify(
      normalizeWppGroups(has('wpp_groups') ? body.wpp_groups : undefined, parseWppGroups(current.wpp_groups))
    ),
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
    res.json((rows || []).map(serializeCliente));
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
    res.json(serializeCliente(row));
  });
});

app.post('/api/clientes', (req, res) => {
  let client;
  try {
    client = normalizeClientPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  db.run('INSERT INTO clientes (nombre, contacto, telefono, email, wpp_groups) VALUES (?, ?, ?, ?, ?)', [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.status(201).json(serializeCliente(row));
    });
  });
});

app.put('/api/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    let client;
    try {
      client = normalizeClientPayload(req.body, serializeCliente(row));
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    db.run(
      'UPDATE clientes SET nombre = ?, contacto = ?, telefono = ?, email = ?, wpp_groups = ? WHERE id = ?',
      [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (getErr, updated) => {
          if (getErr) return res.status(500).json({ error: getErr.message });
          res.json(serializeCliente(updated));
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

app.get('/api/remolques', async (req, res) => {
  await getTrailerTempsCached().catch(() => {});
  db.all(`SELECT r.*,
    (SELECT ra.vehicle_name FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as unidad_asignada,
    (SELECT ra.vehicle_id FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as vehicle_id_asignado,
    (SELECT ra.tipo_asignacion FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as tipo_asignacion,
    (SELECT ra.grupo_full FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as grupo_full
    FROM remolques r ORDER BY r.numero ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const enriched = (rows || []).map(r => ({
      ...r,
      trailer_gps: mapTrailerLocation(r.numero),
      temperatura: mapTrailerTemp(r.numero),
    }));
    res.json(enriched);
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

// ============ DATABASE BACKUP ============


app.get('/api/backups', requireAuth, async (req, res) => {
  try {
    res.json(listBackupDetails());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/run', requireAuth, async (req, res) => {
  try {
    const result = await performDatabaseBackup();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AUTO-CHECK INTERVALS ============

let liveSyncInFlight = null;
const runLiveSync = async () => {
  if (liveSyncInFlight) return liveSyncInFlight;
  liveSyncInFlight = (async () => {
    await refreshSamsaraVehicles();
    try {
      await performSamsaraTrailerRefresh();
    } catch (trailerErr) {
      console.error('Error refrescando trailers Samsara:', trailerErr.message);
    }
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
  await loadTrailerLocationsCache().catch(() => {});
  setTimeout(() => performDatabaseBackup().then(r => console.log(`Backup inicial completado: ${r.destination}${r.removed ? ` (${r.removed} eliminados)` : ''}`)).catch(e => console.error('Backup inicial falló:', e.message)), 60000);
  setInterval(() => performDatabaseBackup().then(r => console.log(`Backup automático completado: ${r.destination}`)).catch(e => console.error('Backup automático falló:', e.message)), 24 * 60 * 60 * 1000);
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
