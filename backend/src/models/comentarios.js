const { db, getQuery, runQuery } = require('../db');

function listComentarios(vehicleId) {
  let query = 'SELECT * FROM comentarios';
  const params = [];
  if (vehicleId) {
    query += ' WHERE vehicle_id = ?';
    params.push(vehicleId);
  }
  query += ' ORDER BY created_at DESC';
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createComentario({ vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje, estatus, remolque, grupo, origen, destino, created_by_user_id, created_by_username }) {
  return runQuery(
    'INSERT INTO comentarios (vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje, estatus, remolque, grupo, origen, destino, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, autor, tipo || 'seguimiento', titulo || null, contenido, kilometraje || null, estatus || '', remolque || '', grupo || '', origen || '', destino || '', created_by_user_id, created_by_username]
  );
}

function getComentario(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM comentarios WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function updateComentario(id, { titulo, contenido, tipo }) {
  return runQuery('UPDATE comentarios SET titulo = ?, contenido = ?, tipo = ? WHERE id = ?', [titulo, contenido, tipo, id]);
}

function deleteComentario(id) {
  return runQuery('DELETE FROM comentarios WHERE id = ?', [id]);
}

module.exports = {
  listComentarios,
  createComentario,
  getComentario,
  updateComentario,
  deleteComentario,
};
