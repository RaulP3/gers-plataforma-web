const { db, getQuery, allQuery, runQuery } = require('../db');
const { localTimestampISO } = require('../utils');

function listLocalGeofences(clienteId) {
  const query = clienteId
    ? 'SELECT * FROM geofences WHERE cliente_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM geofences ORDER BY created_at DESC';
  return new Promise((resolve, reject) => {
    db.all(query, clienteId ? [clienteId] : [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getGeofence(id) {
  return getQuery('SELECT id, nombre, cliente_id FROM geofences WHERE id = ?', [id]);
}

function getGeofenceFull(id) {
  return getQuery('SELECT * FROM geofences WHERE id = ?', [id]);
}

function createGeofence({ nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id }) {
  return runQuery(
    'INSERT INTO geofences (nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, direccion || '', latitud, longitud, radio_metros || 500, descripcion || '', color || '#3b82f6', cliente_id || null]
  );
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => Number(v) * Math.PI / 180;
  const dLat = toRad(lat2) - toRad(lat1);
  const dLon = toRad(lon2) - toRad(lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function findGeofenceByNameOrProximity({ nombre, latitud, longitud }, meters = 50) {
  const rows = await allQuery('SELECT id, nombre, latitud, longitud FROM geofences');
  const nameNorm = String(nombre || '').trim().toLowerCase();
  let best = null;
  let bestDist = Infinity;
  const tol = Number(meters) || 50;
  const lat = Number(latitud);
  const lon = Number(longitud);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  for (const r of rows) {
    if (nameNorm && String(r.nombre || '').trim().toLowerCase() === nameNorm) {
      return r;
    }
    if (hasCoords && Number.isFinite(Number(r.latitud)) && Number.isFinite(Number(r.longitud))) {
      const d = haversineMeters(lat, lon, Number(r.latitud), Number(r.longitud));
      if (d <= tol && d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
  }
  return best;
}

function updateGeofence(id, { nombre, direccion, latitud, longitud, radio_metros, descripcion, color, activa, cliente_id }) {
  return runQuery(
    `UPDATE geofences SET nombre = COALESCE(?, nombre), latitud = COALESCE(?, latitud),
     direccion = COALESCE(?, direccion), longitud = COALESCE(?, longitud), radio_metros = COALESCE(?, radio_metros),
     descripcion = COALESCE(?, descripcion), color = COALESCE(?, color), activa = COALESCE(?, activa), cliente_id = COALESCE(?, cliente_id)
     WHERE id = ?`,
    [nombre, latitud, direccion, longitud, radio_metros, descripcion, color, activa, cliente_id, id]
  );
}

function toggleGeofences(ids, activa) {
  const placeholders = ids.map(() => '?').join(',');
  return runQuery(`UPDATE geofences SET activa = ? WHERE id IN (${placeholders})`, [activa, ...ids]);
}

function deleteGeofence(id) {
  return runQuery('DELETE FROM geofences WHERE id = ?', [id]);
}

function unlinkGeofenceCliente(id, clienteId) {
  return runQuery('UPDATE geofences SET cliente_id = NULL WHERE id = ? AND cliente_id = ?', [id, clienteId]);
}

function unlinkAllGeofencesCliente(clienteId) {
  return runQuery('UPDATE geofences SET cliente_id = NULL WHERE cliente_id = ?', [clienteId]);
}

function listGeofenceEvents({ vehicle_id, geofence_id, limit }) {
  let query = 'SELECT * FROM geofence_events WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (geofence_id) { query += ' AND geofence_id = ?'; params.push(geofence_id); }
  query += ' ORDER BY created_at DESC';
  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); }
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function clearAllGeofenceEvents() {
  return runQuery('DELETE FROM geofence_events');
}

function clearVehicleGeofenceState() {
  return runQuery('DELETE FROM vehicle_geofence_state');
}

function insertGeofenceEvent({ vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source, event_uid, raw_payload, created_at }) {
  return runQuery(
    `INSERT OR IGNORE INTO geofence_events (vehicle_id, vehicle_name, geofence_id, geofence_nombre, tipo, latitud, longitud, source, event_uid, raw_payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [String(vehicle_id || ''), vehicle_name || '', geofence_id, geofence_nombre, tipo, latitud, longitud, source, event_uid || null, raw_payload || null, created_at || localTimestampISO(new Date())]
  );
}

function getVehicleGeofenceState(vehicleId, geofenceId) {
  return getQuery('SELECT * FROM vehicle_geofence_state WHERE vehicle_id = ? AND geofence_id = ?', [vehicleId, geofenceId]);
}

function upsertVehicleGeofenceState(vehicleId, geofenceId, inside) {
  return runQuery(
    `INSERT OR REPLACE INTO vehicle_geofence_state (vehicle_id, geofence_id, inside, last_check)
     VALUES (?, ?, ?, datetime('now'))`,
    [vehicleId, geofenceId, inside ? 1 : 0]
  );
}

function resetGeofenceState(vehicleId, geofenceId) {
  return runQuery(
    `UPDATE vehicle_geofence_state SET inside = 0, last_check = datetime('now')
      WHERE vehicle_id = ? AND geofence_id = ?`,
    [vehicleId, geofenceId]
  );
}

function listAllGeofenceStates() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM vehicle_geofence_state', [], (err, rows) => {
      if (err) reject(err); else resolve(rows || []);
    });
  });
}

function listActiveLocalGeofences() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT g.*, c.nombre AS cliente_nombre
            FROM geofences g LEFT JOIN clientes c ON c.id = g.cliente_id
            WHERE g.activa = 1`, [], (err, rows) => {
      if (err) reject(err); else resolve(rows || []);
    });
  });
}

function listClienteGeofenceLinks() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM cliente_geofence_links ORDER BY created_at ASC, id ASC', [], (err, rows) => {
      if (err) reject(err); else resolve(rows || []);
    });
  });
}

function getClienteGeofenceLink(source, geofenceRef) {
  return getQuery('SELECT * FROM cliente_geofence_links WHERE source = ? AND geofence_ref = ?', [source, geofenceRef]);
}

function getClienteGeofenceLinkByClient(source, geofenceRef, clienteId) {
  return getQuery('SELECT * FROM cliente_geofence_links WHERE cliente_id = ? AND source = ? AND geofence_ref = ?', [clienteId, source, geofenceRef]);
}

function createClienteGeofenceLink({ cliente_id, source, geofence_ref, geofence_nombre }) {
  return runQuery(
    'INSERT INTO cliente_geofence_links (cliente_id, source, geofence_ref, geofence_nombre) VALUES (?, ?, ?, ?)',
    [cliente_id, source, geofence_ref, geofence_nombre]
  );
}

function deleteClienteGeofenceLink(clienteId, source, geofenceRef) {
  return runQuery('DELETE FROM cliente_geofence_links WHERE cliente_id = ? AND source = ? AND geofence_ref = ?', [clienteId, source, geofenceRef]);
}

function deleteAllClienteGeofenceLinks(clienteId) {
  return runQuery('DELETE FROM cliente_geofence_links WHERE cliente_id = ?', [clienteId]);
}

function findSamsaraGeofenceClient(geofenceId, geofenceName) {
  if (geofenceId) {
    return getQuery(
      `SELECT c.id, c.nombre FROM cliente_geofence_links link
       JOIN clientes c ON c.id = link.cliente_id
       WHERE link.source = 'samsara' AND link.geofence_ref = ?`,
      [String(geofenceId)]
    );
  }
  return getQuery(
    `SELECT c.id, c.nombre FROM cliente_geofence_links link
     JOIN clientes c ON c.id = link.cliente_id
     WHERE link.source = 'samsara' AND LOWER(link.geofence_nombre) = LOWER(?)`,
    [String(geofenceName || '')]
  );
}

module.exports = {
  listLocalGeofences,
  getGeofence,
  getGeofenceFull,
  createGeofence,
  updateGeofence,
  toggleGeofences,
  deleteGeofence,
  unlinkGeofenceCliente,
  unlinkAllGeofencesCliente,
  listGeofenceEvents,
  clearAllGeofenceEvents,
  clearVehicleGeofenceState,
  insertGeofenceEvent,
  getVehicleGeofenceState,
  upsertVehicleGeofenceState,
  resetGeofenceState,
  listAllGeofenceStates,
  listActiveLocalGeofences,
  listClienteGeofenceLinks,
  getClienteGeofenceLink,
  getClienteGeofenceLinkByClient,
  createClienteGeofenceLink,
  deleteClienteGeofenceLink,
  deleteAllClienteGeofenceLinks,
  findSamsaraGeofenceClient,
  findGeofenceByNameOrProximity,
};
