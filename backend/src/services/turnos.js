const { getQuery, allQuery, runQuery } = require('../db');

function buildTurnoText(summary) {
  const lines = [];
  lines.push(`REPORTE DE ENTREGA DE TURNO`);
  lines.push(`Periodo: ultimas ${summary.horas} horas`);
  lines.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
  if (summary.turno) lines.push(`Turno: ${summary.turno}`);
  if (summary.observaciones) lines.push(`Observaciones: ${summary.observaciones}`);
  lines.push('');
  lines.push('RESUMEN');
  lines.push(`- Alertas no leidas: ${summary.alertasNoLeidas}`);
  lines.push(`- Alertas de combustible bajo: ${summary.alertasCombustibleBajo}`);
  lines.push(`- Pendientes que quedan: ${summary.pendientesQueQuedanTotal}`);
  lines.push(`- Pendientes resueltos en turno: ${summary.pendientesResueltosTotal}`);
  lines.push(`- Viajes activos: ${summary.viajesActivos}`);
  lines.push(`- Eventos de geocerca: ${summary.eventosGeocerca}`);
  lines.push(`- Unidades con ubicacion registrada: ${summary.unidadesConUbicacion}`);
  lines.push('');
  lines.push('LO MAS RELEVANTE');
  if (summary.alertasCriticas.length === 0 && summary.eventosRecientes.length === 0 && summary.pendientesQueQuedan.length === 0 && summary.pendientesResueltos.length === 0) {
    lines.push('- No se detectaron eventos criticos relevantes en el periodo.');
  } else {
    summary.alertasCriticas.forEach(a => lines.push(`- Alerta: ${a.vehicle_name || a.vehicle_id} | ${a.tipo} | ${a.mensaje}`));
    summary.eventosRecientes.forEach(e => lines.push(`- Geocerca: ${e.vehicle_name || e.vehicle_id} | ${e.geofence_nombre} | ${e.tipo} | ${e.created_at}`));
    if (summary.pendientesResueltos.length) {
      lines.push('Pendientes resueltos:');
      summary.pendientesResueltos.forEach(p => lines.push(`- ${p.titulo} | ${p.prioridad} | ${p.fecha_actualizacion || p.fecha_creacion}`));
    }
    if (summary.pendientesQueQuedan.length) {
      lines.push('Pendientes que se quedan:');
      summary.pendientesQueQuedan.forEach(p => lines.push(`- ${p.titulo} | ${p.prioridad} | ${p.estado} | ${p.asignado_a || 'Sin asignar'}`));
    }
  }
  return lines.join('\n');
}

async function getTurnoSummary(hours = 8, turno = '', observaciones = '') {
  const safeHours = Math.max(1, Math.min(Number(hours) || 8, 72));
  const periodStart = `datetime('now', '-${safeHours} hours')`;

  const [alertasNoLeidas, alertasCombustibleBajo, pendientesQueQuedanTotal, pendientesResueltosTotal, viajesActivos, eventosGeocerca, eventosRecientes, alertasCriticas, pendientesQueQuedan, pendientesResueltos, unidadesConUbicacion] = await Promise.all([
    getQuery('SELECT COUNT(*) as total FROM alertas WHERE leida = 0 AND COALESCE(archivada, 0) = 0'),
    getQuery(`SELECT COUNT(*) as total FROM alertas WHERE tipo = 'combustible_bajo' AND timestamp >= ${periodStart}`),
    getQuery("SELECT COUNT(*) as total FROM pendientes WHERE estado != 'completado'"),
    getQuery(`SELECT COUNT(*) as total FROM pendientes WHERE estado = 'completado' AND fecha_actualizacion >= ${periodStart}`),
    getQuery("SELECT COUNT(*) as total FROM viajes WHERE estado NOT IN ('completado', 'cancelado')"),
    getQuery(`SELECT COUNT(*) as total FROM geofence_events WHERE created_at >= ${periodStart}`),
    allQuery(`SELECT * FROM geofence_events WHERE created_at >= ${periodStart} ORDER BY created_at DESC LIMIT 5`),
    allQuery(`SELECT * FROM alertas WHERE (severidad IN ('critica', 'alta') OR tipo = 'combustible_bajo') AND timestamp >= ${periodStart} ORDER BY timestamp DESC LIMIT 5`),
    allQuery(`SELECT * FROM pendientes WHERE estado != 'completado' ORDER BY CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 ELSE 4 END, fecha_creacion DESC LIMIT 8`),
    allQuery(`SELECT * FROM pendientes WHERE estado = 'completado' AND fecha_actualizacion >= ${periodStart} ORDER BY fecha_actualizacion DESC LIMIT 8`),
    getQuery('SELECT COUNT(*) as total FROM vehicle_locations'),
  ]);

  const summary = {
    horas: safeHours,
    turno,
    observaciones,
    alertasNoLeidas: alertasNoLeidas?.total || 0,
    alertasCombustibleBajo: alertasCombustibleBajo?.total || 0,
    pendientesQueQuedanTotal: pendientesQueQuedanTotal?.total || 0,
    pendientesResueltosTotal: pendientesResueltosTotal?.total || 0,
    viajesActivos: viajesActivos?.total || 0,
    eventosGeocerca: eventosGeocerca?.total || 0,
    eventosRecientes,
    alertasCriticas,
    pendientesQueQuedan,
    pendientesResueltos,
    unidadesConUbicacion: unidadesConUbicacion?.total || 0,
  };

  summary.texto = buildTurnoText(summary);
  return summary;
}

async function saveTurnoReporte(user, { horas = 8, turno = '', observaciones = '' }) {
  const summary = await getTurnoSummary(horas, turno, observaciones);
  const saved = await runQuery(
    `INSERT INTO turnos_reportes (turno, horas, observaciones, resumen_json, resumen_texto, created_by, created_by_username)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      turno || '',
      summary.horas,
      observaciones || '',
      JSON.stringify(summary),
      summary.texto,
      user?.id || null,
      user?.username || '',
    ]
  );
  const report = await getQuery('SELECT * FROM turnos_reportes WHERE id = ?', [saved.lastID]);
  return { summary, report };
}

function listTurnoReportes() {
  return allQuery('SELECT * FROM turnos_reportes ORDER BY created_at DESC LIMIT 50');
}

module.exports = { buildTurnoText, getTurnoSummary, saveTurnoReporte, listTurnoReportes };
