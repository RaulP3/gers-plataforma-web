const { getQuery, allQuery, runQuery } = require('../db');

function getTurnoReporte(id) {
  return getQuery('SELECT * FROM turnos_reportes WHERE id = ?', [id]);
}

function createTurnoReporte({ turno, horas, observaciones, resumen_json, resumen_texto, created_by, created_by_username }) {
  return runQuery(
    `INSERT INTO turnos_reportes (turno, horas, observaciones, resumen_json, resumen_texto, created_by, created_by_username)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [turno || '', horas, observaciones || '', resumen_json, resumen_texto, created_by || null, created_by_username || '']
  );
}

function listTurnoReportes() {
  return allQuery('SELECT * FROM turnos_reportes ORDER BY created_at DESC LIMIT 50');
}

module.exports = { getTurnoReporte, createTurnoReporte, listTurnoReportes };
