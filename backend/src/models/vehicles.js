const { db, getQuery, runQuery } = require('../db');

function listVehicleOperators() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM vehicle_operators', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getVehicleOperator(vehicleId) {
  return getQuery('SELECT * FROM vehicle_operators WHERE vehicle_id = ?', [vehicleId]);
}

function upsertVehicleOperator(vehicleId, next) {
  return getQuery('SELECT * FROM vehicle_operators WHERE vehicle_id = ?', [vehicleId])
    .then(row => {
      if (row) {
        return runQuery(
          'UPDATE vehicle_operators SET vehicle_name = ?, operator_name = ?, telefono = ?, driver_id_samsara = ?, updated_at = datetime(\'now\') WHERE vehicle_id = ?',
          [next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara, vehicleId]
        );
      }
      return runQuery(
        'INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, telefono, driver_id_samsara, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
        [vehicleId, next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara]
      );
    });
}

function saveVehicleLocation({ vehicle_id, vehicle_name, latitude, longitude, speed, location, time_ms }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO vehicle_locations (vehicle_id, vehicle_name, latitude, longitude, speed, location, time_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [vehicle_id, vehicle_name || null, latitude, longitude, speed, location || '', time_ms],
      function (err) {
        if (err) return reject(err);
        resolve(this);
      }
    );
  });
}

function insertRouteHistoryPoint({ vehicle_id, vehicle_name, latitude, longitude, speed, heading, location, source_time_ms }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO route_history (vehicle_id, vehicle_name, latitude, longitude, speed, heading, location, source_time_ms, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicle_id, vehicle_name || null, latitude, longitude, speed, heading, location || '', source_time_ms, new Date(source_time_ms).toISOString().replace('T', ' ').replace('Z', '')],
      function (err) {
        if (err) return reject(err);
        resolve(this);
      }
    );
  });
}

function insertTrailerLocation({ trailer_id, trailer_name, latitude, longitude, speed, location, time_ms }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO trailer_locations (trailer_id, trailer_name, latitude, longitude, speed, location, time_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [trailer_id, trailer_name || null, latitude, longitude, speed || 0, location || '', time_ms],
      function (err) {
        if (err) return reject(err);
        resolve(this);
      }
    );
  });
}

function listTrailerLocations() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM trailer_locations', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function listRouteHistory({ vehicle_id, fecha_inicio, fecha_fin, limit }) {
  let query = 'SELECT * FROM route_history WHERE vehicle_id = ?';
  const params = [vehicle_id];
  if (fecha_inicio) { query += ' AND recorded_at >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND recorded_at <= ?'; params.push(fecha_fin + ' 23:59:59'); }
  query += ' ORDER BY recorded_at ASC';
  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); }
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function listRouteHistoryVehicles() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT vehicle_id, vehicle_name, COUNT(*) as total_points,
              MIN(recorded_at) as primera_ubicacion, MAX(recorded_at) as ultima_ubicacion
       FROM route_history GROUP BY vehicle_id ORDER BY ultima_ubicacion DESC`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function listRouteHistoryDates(vehicle_id) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DATE(recorded_at) as fecha, COUNT(*) as puntos
       FROM route_history WHERE vehicle_id = ?
       GROUP BY DATE(recorded_at) ORDER BY fecha DESC`,
      [vehicle_id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function deleteRouteHistory({ vehicle_id, fecha }) {
  let query = 'DELETE FROM route_history WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (fecha) { query += ' AND DATE(recorded_at) = ?'; params.push(fecha); }
  return runQuery(query, params);
}

function queryRouteHistoryLast(select, params) {
  return new Promise((resolve, reject) => {
    db.all(select, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = {
  listVehicleOperators,
  getVehicleOperator,
  upsertVehicleOperator,
  saveVehicleLocation,
  insertRouteHistoryPoint,
  insertTrailerLocation,
  listTrailerLocations,
  listRouteHistory,
  listRouteHistoryVehicles,
  listRouteHistoryDates,
  deleteRouteHistory,
  queryRouteHistoryLast,
};
