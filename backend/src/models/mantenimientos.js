const { db, getQuery, allQuery, runQuery } = require('../db');

function listMantenimientos() {
  return allQuery('SELECT * FROM mantenimientos ORDER BY CASE estado WHEN \'vencido\' THEN 0 WHEN \'proximo\' THEN 1 WHEN \'programado\' THEN 2 WHEN \'completado\' THEN 3 ELSE 4 END, fecha_proxima ASC');
}

function listMantenimientosPendientes() {
  return allQuery("SELECT * FROM mantenimientos WHERE estado != 'completado'");
}

function getMantenimiento(id) {
  return getQuery('SELECT * FROM mantenimientos WHERE id = ?', [id]);
}

function createMantenimiento({ entidad_tipo, entidad_id, entidad_nombre, tipo_servicio, fecha_ultimo, fecha_proxima, intervalo_dias, kilometraje_ultimo, kilometraje_proximo, estado, notas, created_by_username }) {
  return runQuery(
    `INSERT INTO mantenimientos (entidad_tipo, entidad_id, entidad_nombre, tipo_servicio, fecha_ultimo, fecha_proxima, intervalo_dias, kilometraje_ultimo, kilometraje_proximo, estado, notas, created_by_username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entidad_tipo, String(entidad_id), String(entidad_nombre), String(tipo_servicio), fecha_ultimo || null, fecha_proxima || null, Number(intervalo_dias) || 30, kilometraje_ultimo || null, kilometraje_proximo || null, String(estado), String(notas), created_by_username || '']
  );
}

function updateMantenimiento(id, next) {
  return runQuery(
    'UPDATE mantenimientos SET estado = ?, fecha_proxima = ?, fecha_ultimo = ?, notas = ?, kilometraje_proximo = ?, kilometraje_ultimo = ?, intervalo_dias = ?, tipo_servicio = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [next.estado, next.fecha_proxima, next.fecha_ultimo, next.notas, next.kilometraje_proximo, next.kilometraje_ultimo, next.intervalo_dias, next.tipo_servicio, id]
  );
}

function deleteMantenimiento(id) {
  return runQuery('DELETE FROM mantenimientos WHERE id = ?', [id]);
}

module.exports = {
  listMantenimientos,
  listMantenimientosPendientes,
  getMantenimiento,
  createMantenimiento,
  updateMantenimiento,
  deleteMantenimiento,
};
