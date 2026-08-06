const { db, getQuery, runQuery } = require('../db');

function listUnidades() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM unidades ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createUnidad({ nombre, estatus, notas, tipo, samsara_id }) {
  return runQuery(
    'INSERT INTO unidades (nombre, estatus, notas, tipo, samsara_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, estatus || 'Activa', notas || '', tipo || 'manual', samsara_id || '']
  );
}

function getUnidad(id) {
  return getQuery('SELECT * FROM unidades WHERE id = ?', [id]);
}

function updateUnidad(id, next) {
  return runQuery(
    `UPDATE unidades SET nombre = ?, estatus = ?, notas = ?, tipo = ?, samsara_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [next.nombre, next.estatus, next.notas, next.tipo, next.samsara_id || '', id]
  );
}

function deleteUnidad(id) {
  return runQuery('DELETE FROM unidades WHERE id = ?', [id]);
}

module.exports = { listUnidades, createUnidad, getUnidad, updateUnidad, deleteUnidad };
