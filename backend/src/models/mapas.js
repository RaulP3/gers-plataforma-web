const { db, getQuery, runQuery } = require('../db');

function listMapas() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM mapas_mymaps ORDER BY created_at DESC, id DESC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getMapa(id) {
  return getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [id]);
}

function createMapa({ nombre, descripcion, origen, destino, tipo_entrega, destinos_json, url, created_by_user_id, created_by_username }) {
  return runQuery(
    `INSERT INTO mapas_mymaps (nombre, descripcion, origen, destino, tipo_entrega, destinos_json, url, created_by_user_id, created_by_username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, descripcion ?? null, origen ?? null, destino ?? null, tipo_entrega ?? 'directo', destinos_json ?? null, url, created_by_user_id, created_by_username]
  );
}

function updateMapa(id, fields) {
  return runQuery(
    `UPDATE mapas_mymaps SET nombre = ?, descripcion = ?, origen = ?, destino = ?, tipo_entrega = ?, destinos_json = ?, url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [fields.nombre, fields.descripcion, fields.origen, fields.destino, fields.tipo_entrega ?? 'directo', fields.destinos_json ?? null, fields.url, id]
  );
}

function getMapaOwner(id) {
  return getQuery('SELECT id, created_by_user_id FROM mapas_mymaps WHERE id = ?', [id]);
}

function deleteMapa(id) {
  return runQuery('DELETE FROM mapas_mymaps WHERE id = ?', [id]);
}

module.exports = { listMapas, getMapa, createMapa, updateMapa, getMapaOwner, deleteMapa };
