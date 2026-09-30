const { db, getQuery, allQuery, runQuery } = require('../db');

function listPendientes({ turno, estado } = {}) {
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (turno) { query += ' AND turno = ?'; params.push(turno); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  query += ' ORDER BY CASE prioridad WHEN "alta" THEN 1 WHEN "media" THEN 2 WHEN "baja" THEN 3 ELSE 4 END, fecha_creacion DESC';
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createPendiente({ titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por, created_by_user_id, created_by_username }) {
  return runQuery(
    'INSERT INTO pendientes (titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por, created_by_user_id, created_by_username, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
    [titulo, descripcion || '', prioridad || 'media', asignado_a || '', turno || '', notas || '', creado_por, created_by_user_id, created_by_username]
  );
}

function getPendiente(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM pendientes WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function updatePendiente(id, next) {
  return runQuery(
    'UPDATE pendientes SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, asignado_a = ?, turno = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
    [next.titulo, next.descripcion, next.prioridad, next.estado, next.asignado_a, next.turno, next.notas, id]
  );
}

function listPendientesCompletados(fechaInicio, fechaFin) {
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (fechaInicio) { query += ' AND fecha_creacion >= ?'; params.push(fechaInicio); }
  if (fechaFin) { query += " AND fecha_creacion < datetime(?, '+1 day')"; params.push(fechaFin); }
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function listComentariosPendiente(pendienteId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM comentarios_pendientes WHERE pendiente_id = ? ORDER BY fecha_creacion DESC', [pendienteId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function createComentarioPendiente({ pendiente_id, autor, contenido, created_by_user_id, created_by_username }) {
  return runQuery(
    'INSERT INTO comentarios_pendientes (pendiente_id, autor, contenido, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?)',
    [pendiente_id, autor, contenido, created_by_user_id, created_by_username]
  );
}

function deleteComentarioPendiente(comentarioId, pendienteId) {
  return runQuery('DELETE FROM comentarios_pendientes WHERE id = ? AND pendiente_id = ?', [comentarioId, pendienteId]);
}

function listPendientesHistorial() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM pendientes_historial ORDER BY archived_at DESC, id DESC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = {
  listPendientes,
  createPendiente,
  getPendiente,
  updatePendiente,
  listPendientesCompletados,
  listComentariosPendiente,
  createComentarioPendiente,
  deleteComentarioPendiente,
  listPendientesHistorial,
};
