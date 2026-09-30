const { getQuery, allQuery } = require('../db');
const { parseFechaLocal } = require('../utils');

async function computePuntualidadKpi() {
  const rows = await allQuery(
    `SELECT v.hora_llegada, COALESCE(v.cita_programada, vp.hora_programada, v.fecha_fin) AS cita
     FROM viajes v
     LEFT JOIN viaje_paradas vp ON vp.viaje_id = v.id AND vp.orden = 1
     WHERE v.estado = 'completado'
       AND v.hora_llegada IS NOT NULL
       AND v.hora_llegada >= datetime('now', '-60 days')`
  );
  const TOLERANCIA_MS = 30 * 60 * 1000;
  let entregas = 0;
  let aTiempo = 0;
  let retrasadas = 0;
  for (const row of rows) {
    const llegada = parseFechaLocal(row.hora_llegada);
    const cita = parseFechaLocal(row.cita);
    if (!llegada || !cita || Number.isNaN(llegada.getTime()) || Number.isNaN(cita.getTime())) continue;
    entregas++;
    const diff = llegada.getTime() - cita.getTime();
    if (diff <= TOLERANCIA_MS) aTiempo++;
    else retrasadas++;
  }
  return {
    entregas,
    aTiempo,
    retrasadas,
    porcentaje: entregas ? Math.round((aTiempo / entregas) * 100) : 0,
    toleranciaMin: 30,
  };
}

async function computeViajesSemanaKpi() {
  const rows = await allQuery(
    `SELECT fecha_inicio, created_at, estado
     FROM viajes
     WHERE COALESCE(fecha_inicio, created_at) >= datetime('now', '-70 days')`
  );
  const semanas = [];
  const hoy = new Date();
  const inicioSemanaActual = new Date(hoy);
  const dia = (hoy.getDay() + 6) % 7;
  inicioSemanaActual.setDate(hoy.getDate() - dia);
  inicioSemanaActual.setHours(0, 0, 0, 0);
  for (let i = 7; i >= 0; i--) {
    const ini = new Date(inicioSemanaActual);
    ini.setDate(inicioSemanaActual.getDate() - i * 7);
    const fin = new Date(ini);
    fin.setDate(ini.getDate() + 7);
    const total = rows.filter(r => {
      const f = parseFechaLocal(r.fecha_inicio || r.created_at);
      if (!f || Number.isNaN(f.getTime())) return false;
      return f >= ini && f < fin;
    }).length;
    const activos = rows.filter(r => {
      const f = parseFechaLocal(r.fecha_inicio || r.created_at);
      if (!f || Number.isNaN(f.getTime())) return false;
      const activo = !['completado', 'cancelado'].includes(String(r.estado || '').toLowerCase());
      return f >= ini && f < fin && activo;
    }).length;
    semanas.push({
      inicio: ini.toISOString().slice(0, 10),
      fin: new Date(fin.getTime() - 1).toISOString().slice(0, 10),
      total,
      activos,
    });
  }
  return semanas;
}

async function computeUsoFlotaKpi() {
  const [totalUnidades, unidadesOnline, viajesActivos, remolquesAsignados] = await Promise.all([
    getQuery('SELECT COUNT(*) as total FROM vehicle_locations'),
    getQuery('SELECT COUNT(DISTINCT vehicle_id) as total FROM vehicle_locations WHERE time_ms IS NOT NULL'),
    getQuery(`SELECT COUNT(*) as total FROM viajes WHERE estado NOT IN ('completado', 'cancelado')`),
    getQuery('SELECT COUNT(DISTINCT remolque_id) as total FROM remolque_asignaciones WHERE activa = 1'),
  ]);
  const total = totalUnidades?.total || 0;
  const enViaje = viajesActivos?.total || 0;
  return {
    totalUnidades: total,
    unidadesOnline: unidadesOnline?.total || 0,
    viajesActivos: enViaje,
    remolquesAsignados: remolquesAsignados?.total || 0,
    porcentaje: total ? Math.round((enViaje / total) * 100) : 0,
  };
}

async function computeCitasHoyKpi() {
  const hoy = new Date();
  const ini = new Date(hoy);
  ini.setHours(0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  const [viajes, seguimientoRows] = await Promise.all([
    allQuery(`SELECT fecha_inicio, fecha_fin, estado FROM viajes WHERE estado NOT IN ('completado', 'cancelado')`),
    allQuery(`SELECT cita_carga, cita_descarga, estatus FROM seguimiento WHERE COALESCE(estatus, '') NOT IN ('completado', 'cancelado')`),
  ]);
  const citaViaje = v => parseFechaLocal(v.fecha_fin) || parseFechaLocal(v.fecha_inicio);
  const citaSeg = s => parseFechaLocal(s.cita_descarga) || parseFechaLocal(s.cita_carga);
  const enRango = f => f && !Number.isNaN(f.getTime()) && f >= ini && f <= fin;
  const viajesHoy = (viajes || []).filter(v => enRango(citaViaje(v)));
  const seguimientoHoy = (seguimientoRows || []).filter(s => enRango(citaSeg(s)));
  const todas = [...viajesHoy.map(v => ({ cita: citaViaje(v) })),
    ...seguimientoHoy.map(s => ({ cita: citaSeg(s) }))];
  const proxima = [...(viajes || []).map(citaViaje), ...(seguimientoRows || []).map(citaSeg)]
    .filter(t => t && !Number.isNaN(t.getTime()) && t.getTime() >= Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
  return {
    total: todas.length,
    viajes: viajesHoy.length,
    seguimiento: seguimientoHoy.length,
    proximaCita: proxima,
  };
}

async function computeRemolquesKpi() {
  const [total, refris, disponibles, online] = await Promise.all([
    getQuery('SELECT COUNT(*) as total FROM remolques'),
    getQuery(`SELECT COUNT(*) as total FROM remolques WHERE categoria LIKE '%refri%' OR categoria LIKE '%refrigerado%'`),
    getQuery(`SELECT COUNT(*) as total FROM remolques WHERE status = 'disponible'`),
    getQuery('SELECT COUNT(*) as total FROM trailer_locations'),
  ]);
  return {
    total: total?.total || 0,
    refrigerados: refris?.total || 0,
    disponibles: disponibles?.total || 0,
    conGps: online?.total || 0,
  };
}

async function computeKpis() {
  const start = Date.now();
  const [puntualidad, viajesSemanas, usoFlota, citasHoy, remolquesKpi] = await Promise.all([
    computePuntualidadKpi(),
    computeViajesSemanaKpi(),
    computeUsoFlotaKpi(),
    computeCitasHoyKpi(),
    computeRemolquesKpi(),
  ]);
  return {
    puntualidad,
    viajesPorSemana: viajesSemanas,
    usoFlota,
    citasHoy,
    remolques: remolquesKpi,
    computadoEnMs: Date.now() - start,
  };
}

module.exports = {
  computePuntualidadKpi,
  computeViajesSemanaKpi,
  computeUsoFlotaKpi,
  computeCitasHoyKpi,
  computeRemolquesKpi,
  computeKpis,
};
