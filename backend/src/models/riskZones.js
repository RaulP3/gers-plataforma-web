const { db, runQuery } = require('../db');

function listRiskZones() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM risk_zones ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createRiskZone({ name, description, severity, lat, lng, radius }) {
  return runQuery(
    'INSERT INTO risk_zones (name, description, severity, lat, lng, radius) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || '', severity || 'high', lat, lng, radius || 5000]
  );
}

function deleteRiskZone(id) {
  return runQuery('DELETE FROM risk_zones WHERE id = ?', [id]);
}

module.exports = { listRiskZones, createRiskZone, deleteRiskZone };
