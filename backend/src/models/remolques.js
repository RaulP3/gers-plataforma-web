const { db, getQuery, allQuery, runQuery } = require('../db');

function listRemolques() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT r.*,
      (SELECT ra.vehicle_name FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as unidad_asignada,
      (SELECT ra.vehicle_id FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as vehicle_id_asignado,
      (SELECT ra.tipo_asignacion FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as tipo_asignacion,
      (SELECT ra.grupo_full FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as grupo_full
      FROM remolques r ORDER BY r.numero ASC`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function createRemolque({ numero, categoria, resguardo, fecha_cita }) {
  return runQuery(
    'INSERT INTO remolques (numero, categoria, resguardo, fecha_cita) VALUES (?, ?, ?, ?)',
    [String(numero).trim(), categoria || 'Caja Seca', resguardo ? 1 : 0, fecha_cita || null]
  );
}

function getRemolque(id) {
  return getQuery('SELECT * FROM remolques WHERE id = ?', [id]);
}

function updateRemolque(id, { numero, categoria, resguardo, fecha_cita }) {
  return runQuery(
    `UPDATE remolques SET numero = ?, categoria = ?,
       resguardo = COALESCE(?, resguardo), fecha_cita = COALESCE(?, fecha_cita)
     WHERE id = ?`,
    [String(numero).trim(), categoria || 'Caja Seca', resguardo === undefined ? null : (resguardo ? 1 : 0), fecha_cita ?? null, id]
  );
}

function setRemolqueResguardo(id, { resguardo, fecha_cita }) {
  return runQuery(
    `UPDATE remolques SET resguardo = ?, fecha_cita = COALESCE(?, fecha_cita),
       status = CASE WHEN EXISTS (SELECT 1 FROM remolque_asignaciones ra WHERE ra.remolque_id = remolques.id AND ra.activa = 1) THEN 'asignado'
                     WHEN COALESCE(?, 0) = 1 THEN 'resguardo' ELSE 'disponible' END
     WHERE id = ?`,
    [resguardo ? 1 : 0, fecha_cita ?? null, resguardo ? 1 : 0, id]
  );
}

function deleteRemolque(id) {
  return runQuery('DELETE FROM remolques WHERE id = ?', [id]);
}

function updateRemolqueStatus(id, status) {
  return runQuery('UPDATE remolques SET status = ? WHERE id = ?', [status, id]);
}

function resolveRemolquesByNumeros(numbers) {
  const placeholders = numbers.map(() => '?').join(',');
  return allQuery(`SELECT id, numero FROM remolques WHERE numero IN (${placeholders})`, numbers);
}

function getActiveAsignacionByRemolque(remolqueId) {
  return getQuery('SELECT * FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1', [remolqueId]);
}

function getActiveGrupoFull(remolqueId) {
  return getQuery('SELECT grupo_full FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1', [remolqueId]);
}

function listActiveAsignacionesByVehicle(vehicleId) {
  return allQuery('SELECT * FROM remolque_asignaciones WHERE activa = 1 AND vehicle_id = ?', [vehicleId]);
}

function listActiveAsignacionesByVehicleOrRemolques(vehicleId, remolqueIds) {
  const placeholders = remolqueIds.map(() => '?').join(',');
  return allQuery(
    `SELECT DISTINCT remolque_id FROM remolque_asignaciones
     WHERE activa = 1 AND (vehicle_id = ? OR remolque_id IN (${placeholders}))`,
    [vehicleId, ...remolqueIds]
  );
}

function listActiveAsignacionesByVehicleOrGrupo(remolqueId, vehicleId, grupoFull) {
  return allQuery(
    `SELECT DISTINCT remolque_id FROM remolque_asignaciones
     WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
    [remolqueId, vehicleId, grupoFull || null, grupoFull || null]
  );
}

function getActiveElsewhere(remolqueIdA, remolqueIdB, vehicleId) {
  return getQuery(
    'SELECT id FROM remolque_asignaciones WHERE activa = 1 AND remolque_id IN (?, ?) AND vehicle_id <> ? LIMIT 1',
    [remolqueIdA, remolqueIdB, vehicleId]
  );
}

function deactivateAsignacionesByVehicleOrRemolques(vehicleId, remolqueIds) {
  const placeholders = remolqueIds.map(() => '?').join(',');
  return runQuery(
    `UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP
     WHERE activa = 1 AND (vehicle_id = ? OR remolque_id IN (${placeholders}))`,
    [vehicleId, ...remolqueIds]
  );
}

function deactivateAsignacionesByVehicle(vehicleId) {
  return runQuery(
    'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE activa = 1 AND vehicle_id = ?',
    [vehicleId]
  );
}

function deactivateAsignacionesByVehicleOrGrupo(remolqueId, vehicleId, grupoFull) {
  return runQuery(
    `UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP
     WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
    [remolqueId, vehicleId, grupoFull || null, grupoFull || null]
  );
}

function deactivateAsignacionesByRemolque(remolqueId) {
  return runQuery(
    'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = COALESCE(fecha_fin, CURRENT_TIMESTAMP) WHERE remolque_id = ? AND activa = 1',
    [remolqueId]
  );
}

function deactivateAsignacionesByGrupo(grupoFull) {
  return runQuery(
    'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE grupo_full = ? AND activa = 1',
    [grupoFull]
  );
}

function listActiveAsignacionesByGrupo(grupoFull) {
  return allQuery('SELECT remolque_id FROM remolque_asignaciones WHERE grupo_full = ? AND activa = 1', [grupoFull]);
}

function deleteAllAsignacionesByRemolque(remolqueId) {
  return runQuery('DELETE FROM remolque_asignaciones WHERE remolque_id = ?', [remolqueId]);
}

function createAsignacion({ remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full }) {
  return runQuery(
    `INSERT INTO remolque_asignaciones
       (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
     VALUES (?, ?, ?, ?, ?)`,
    [remolque_id, vehicle_id, vehicle_name || '', tipo_asignacion, grupo_full || null]
  );
}

function listAsignacionesHistorial(remolqueId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM remolque_asignaciones WHERE remolque_id = ? ORDER BY created_at DESC', [remolqueId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function listActiveAsignaciones() {
  return new Promise((resolve, reject) => {
    db.all('SELECT ra.*, r.numero as remolque_numero FROM remolque_asignaciones ra JOIN remolques r ON r.id = ra.remolque_id WHERE ra.activa = 1', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function listRemolquesByIds(ids) {
  const placeholders = ids.map(() => '?').join(',');
  return allQuery(
    `SELECT id, numero, categoria, status, resguardo FROM remolques WHERE id IN (${placeholders}) ORDER BY id`,
    ids
  );
}

async function getRemolqueResguardo(id) {
  return getQuery('SELECT id, numero, categoria, status, resguardo, fecha_cita FROM remolques WHERE id = ?', [id]);
}

module.exports = {
  listRemolques,
  createRemolque,
  getRemolque,
  updateRemolque,
  deleteRemolque,
  updateRemolqueStatus,
  resolveRemolquesByNumeros,
  getActiveAsignacionByRemolque,
  getActiveGrupoFull,
  listActiveAsignacionesByVehicle,
  listActiveAsignacionesByVehicleOrRemolques,
  listActiveAsignacionesByVehicleOrGrupo,
  getActiveElsewhere,
  deactivateAsignacionesByVehicleOrRemolques,
  deactivateAsignacionesByVehicle,
  deactivateAsignacionesByVehicleOrGrupo,
  deactivateAsignacionesByRemolque,
  deactivateAsignacionesByGrupo,
  listActiveAsignacionesByGrupo,
  deleteAllAsignacionesByRemolque,
  createAsignacion,
  listAsignacionesHistorial,
  listActiveAsignaciones,
  listRemolquesByIds,
  setRemolqueResguardo,
  getRemolqueResguardo,
};
