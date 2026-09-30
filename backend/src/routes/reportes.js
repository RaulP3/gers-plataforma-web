const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/reportes/seguimiento', (req, res) => {
  const { vehicle_id, unidad, fecha_inicio, fecha_fin } = req.query;
  let query = `SELECT id, unidad, grupo, remolque, operador, origen, destino, ruta,
                      cita_carga, cita_descarga, hora_llegada, hora_liberacion,
                      estatus, comentarios_cliente, comentarios_monitoreo, fecha_actualizacion
               FROM seguimiento WHERE 1=1`;
  const params = [];
  if (unidad) {
    query += ' AND LOWER(unidad) = LOWER(?)';
    params.push(unidad);
  } else if (vehicle_id) {
    query += ` AND unidad IN (
      SELECT vehicle_name FROM vehicle_locations WHERE vehicle_id = ?
      UNION SELECT vehicle_name FROM viajes WHERE vehicle_id = ?
    )`;
    params.push(vehicle_id, vehicle_id);
  }
  if (fecha_inicio) {
    query += ' AND fecha_actualizacion >= ?';
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    query += " AND fecha_actualizacion < datetime(?, '+1 day')";
    params.push(fecha_fin);
  }
  query += ' ORDER BY unidad COLLATE NOCASE ASC, id ASC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/reportes/resumen', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as total FROM pendientes', [], (err, row) => {
    stats.totalPendientes = row?.total || 0;
    db.get('SELECT COUNT(*) as total FROM viajes', [], (err, row) => {
      stats.totalViajes = row?.total || 0;
      db.get("SELECT COUNT(*) as programados FROM viajes WHERE estado = 'programado'", [], (err, row) => {
        stats.viajesProgramados = row?.programados || 0;
        db.get('SELECT COUNT(*) as total FROM alertas WHERE leida = 0 AND COALESCE(archivada, 0) = 0', [], (err, row) => {
          stats.alertasNoLeidas = row?.total || 0;
          res.json(stats);
        });
      });
    });
  });
});

router.get('/reportes/pendientes', (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (fecha_inicio) { query += ' AND fecha_creacion >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += " AND fecha_creacion < datetime(?, '+1 day')"; params.push(fecha_fin); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/reportes/viajes', (req, res) => {
  const { fecha_inicio, fecha_fin, estado } = req.query;
  let query = 'SELECT * FROM viajes WHERE 1=1';
  const params = [];
  if (fecha_inicio) { query += ' AND (fecha_fin IS NULL OR fecha_fin >= ?)'; params.push(fecha_inicio); }
  if (fecha_fin) { query += " AND fecha_inicio < datetime(?, '+1 day')"; params.push(fecha_fin); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
