const { getQuery, allQuery, runQuery } = require('../db');

function listViajes() {
  return allQuery(`SELECT * FROM viajes ORDER BY
    CASE LOWER(COALESCE(estado, ''))
      WHEN 'en_ruta_cargado' THEN 0
      WHEN 'en_ruta_vacio' THEN 1
      WHEN 'proceso_carga' THEN 2
      WHEN 'proceso_descarga' THEN 3
      WHEN 'proceso_liberacion' THEN 4
      WHEN 'espera_ingreso' THEN 5
      WHEN 'en_resguardo' THEN 6
      WHEN 'programado' THEN 7
      WHEN 'disponible' THEN 8
      WHEN 'completado' THEN 9
      WHEN 'cancelado' THEN 10
      ELSE 99
    END,
    COALESCE(fecha_inicio, created_at) ASC`);
}

function listViajesActivos() {
  return allQuery(
    `SELECT v.*, s.remolque as seg_remolque, s.origen as seg_origen, s.destino as seg_destino, s.estatus as seg_estatus,
          s.cita_carga, s.cita_descarga, s.hora_llegada, s.hora_liberacion
    FROM viajes v
    LEFT JOIN seguimiento s ON s.id = (
      SELECT s2.id
      FROM seguimiento s2
      WHERE s2.unidad = v.vehicle_name
      ORDER BY datetime(s2.fecha_actualizacion) DESC, s2.id DESC
      LIMIT 1
    )
    WHERE v.estado NOT IN ('completado', 'cancelado')
   ORDER BY
     CASE LOWER(COALESCE(v.estado, ''))
       WHEN 'en_ruta_cargado' THEN 0
       WHEN 'en_ruta_vacio' THEN 1
       WHEN 'proceso_carga' THEN 2
       WHEN 'proceso_descarga' THEN 3
       WHEN 'proceso_liberacion' THEN 4
       WHEN 'espera_ingreso' THEN 5
       WHEN 'en_resguardo' THEN 6
       WHEN 'programado' THEN 7
       WHEN 'disponible' THEN 8
       ELSE 99
     END,
     COALESCE(v.fecha_inicio, v.created_at) ASC`
  );
}

function getViaje(id) {
  return getQuery('SELECT * FROM viajes WHERE id = ?', [id]);
}

function createViaje({ vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, cita_programada, notas }) {
  return runQuery(
    'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, cita_programada, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono || '', remolque || '', fecha_inicio, fecha_fin, cita_programada, notas]
  );
}

function updateViaje(id, next) {
  return runQuery(
    'UPDATE viajes SET vehicle_id = ?, vehicle_name = ?, origen = ?, destino = ?, tipo_entrega = ?, destinos_json = ?, conductor = ?, telefono = ?, fecha_inicio = ?, fecha_fin = ?, cita_programada = ?, notas = ?, estado = ?, remolque = ? WHERE id = ?',
    [next.vehicle_id, next.vehicle_name, next.origen, next.destino, next.tipo_entrega, next.destinos_json, next.conductor, next.telefono, next.fecha_inicio, next.fecha_fin, next.cita_programada, next.notas, next.estado, next.remolque, id]
  );
}

function deleteViaje(id) {
  return runQuery('DELETE FROM viajes WHERE id = ?', [id]);
}

function listParadas(viajeId) {
  return allQuery('SELECT * FROM viaje_paradas WHERE viaje_id = ? ORDER BY orden ASC', [viajeId]);
}

function getParadaInViaje(paradaId, viajeId) {
  return getQuery('SELECT * FROM viaje_paradas WHERE id = ? AND viaje_id = ?', [paradaId, viajeId]);
}

function getParada(id) {
  return getQuery('SELECT * FROM viaje_paradas WHERE id = ?', [id]);
}

function updateParada(id, { estado, hora_llegada, hora_salida }) {
  return runQuery(
    'UPDATE viaje_paradas SET estado = ?, hora_llegada = ?, hora_salida = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [estado, hora_llegada || null, hora_salida || null, id]
  );
}

function deleteParadasByViaje(viajeId) {
  return runQuery('DELETE FROM viaje_paradas WHERE viaje_id = ?', [viajeId]);
}

function getNextPendingStop(viajeId, afterOrden) {
  return getQuery("SELECT id FROM viaje_paradas WHERE viaje_id = ? AND orden > ? AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1", [viajeId, afterOrden]);
}

function getNextEnCaminoStop(viajeId, afterOrden) {
  return getQuery("SELECT id FROM viaje_paradas WHERE viaje_id = ? AND orden > ? AND estado = 'en_camino' AND hora_llegada IS NULL ORDER BY orden ASC LIMIT 1", [viajeId, afterOrden]);
}

function getRestantesNotCompleted(viajeId) {
  return allQuery("SELECT id FROM viaje_paradas WHERE viaje_id = ? AND estado NOT IN ('completada', 'omitida')", [viajeId]);
}

function getActiveTripsForVehicle(vehicleId, vehicleName) {
  return allQuery(
    `SELECT * FROM viajes
      WHERE (CAST(vehicle_id AS TEXT) = ? OR LOWER(COALESCE(vehicle_name, '')) = LOWER(?))
        AND LOWER(COALESCE(estado, '')) NOT IN ('cancelado')`,
    [String(vehicleId || ''), String(vehicleName || '')]
  );
}

function getCandidateStopsForVehicle(vehicleId, vehicleName) {
  return allQuery(
    `SELECT vp.*, v.vehicle_id, v.vehicle_name, v.estado AS viaje_estado
       FROM viaje_paradas vp
       JOIN viajes v ON v.id = vp.viaje_id
      WHERE (CAST(v.vehicle_id AS TEXT) = ? OR LOWER(COALESCE(v.vehicle_name, '')) = LOWER(?))
        AND LOWER(COALESCE(v.estado, '')) NOT IN ('cancelado')
      ORDER BY CASE WHEN LOWER(COALESCE(v.estado, '')) IN ('completado') THEN 1 ELSE 0 END ASC, v.id DESC, vp.orden ASC`,
    [String(vehicleId || ''), String(vehicleName || '')]
  );
}

module.exports = {
  listViajes,
  listViajesActivos,
  getViaje,
  createViaje,
  updateViaje,
  deleteViaje,
  listParadas,
  getParada,
  getParadaInViaje,
  updateParada,
  deleteParadasByViaje,
  getNextPendingStop,
  getNextEnCaminoStop,
  getRestantesNotCompleted,
  getActiveTripsForVehicle,
  getCandidateStopsForVehicle,
};
