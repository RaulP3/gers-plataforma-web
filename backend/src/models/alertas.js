const { db, getQuery, runQuery } = require('../db');
const { broadcastLiveUpdate } = require('../cache');

function listAlertas({ archived = false, all = false }) {
  const query = `SELECT * FROM alertas${all ? '' : ' WHERE COALESCE(archivada, 0) = ?'} ORDER BY timestamp DESC`;
  return new Promise((resolve, reject) => {
    db.all(query, all ? [] : [archived ? 1 : 0], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function createAlertRecord({ vehicle_id = '', vehicle_name = '', tipo = 'alerta', mensaje = '', severidad = 'info', timestamp }) {
  const result = await runQuery(
    'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad, timestamp) VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime(\'now\')))',
    [String(vehicle_id), String(vehicle_name), tipo, String(mensaje), severidad, timestamp || null]
  );
  const alert = await getQuery('SELECT * FROM alertas WHERE id = ?', [result.lastID]);
  broadcastLiveUpdate('new-alert', { alert });
  return alert;
}

function getRecentCustomerGeofenceAlert(vehicleId, message) {
  return getQuery(
    `SELECT * FROM alertas
      WHERE vehicle_id = ? AND tipo = 'cliente_geocerca' AND mensaje = ?
        AND datetime(timestamp) >= datetime('now', '-1 minute')
      ORDER BY id DESC LIMIT 1`,
    [String(vehicleId), message]
  );
}

function getRecentAlertByType(vehicleId, tipo, hoursAgo = 4) {
  return getQuery(
    `SELECT id FROM alertas WHERE vehicle_id = ? AND tipo = ? AND timestamp > datetime('now', '-${hoursAgo} hours')`,
    [String(vehicleId), tipo]
  );
}

function markAlertaLeida(id) {
  return runQuery('UPDATE alertas SET leida = 1 WHERE id = ?', [id]);
}

function archivarTodasAlertas() {
  return runQuery("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE COALESCE(archivada, 0) = 0", []);
}

function archivarAlerta(id) {
  return runQuery("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE id = ?", [id]);
}

function restaurarAlerta(id) {
  return runQuery('UPDATE alertas SET archivada = 0, archived_at = NULL WHERE id = ?', [id]);
}

module.exports = {
  listAlertas,
  createAlertRecord,
  getRecentCustomerGeofenceAlert,
  getRecentAlertByType,
  markAlertaLeida,
  archivarTodasAlertas,
  archivarAlerta,
  restaurarAlerta,
};
