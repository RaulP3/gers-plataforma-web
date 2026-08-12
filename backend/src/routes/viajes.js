const express = require('express');
const { db, runQuery, getQuery, allQuery, withTransaction } = require('../db');
const { requireAdmin } = require('../auth');
const { TRIP_ROUTE_STATES, TRIP_TRAILER_ACTIVE_STATES } = require('../config');
const { localTimestampISO } = require('../utils');
const {
  normalizeTripDelivery,
  syncTripStops,
  attachTripStops,
  syncTripTrailer,
} = require('../services/viajes');
const { resetTripGeofenceState, markInitialGeofenceContact, haversineDistance } = require('../services/geofences');

const router = express.Router();

router.get('/viajes', async (req, res) => {
  try {
    const rows = await allQuery(`SELECT * FROM viajes ORDER BY
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
    res.json(await attachTripStops(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/viajes', async (req, res) => {
  const { vehicle_id, vehicle_name, origen, conductor, telefono, fecha_inicio, fecha_fin, notas } = req.body;
  let delivery;
  try {
    delivery = normalizeTripDelivery(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const result = await runQuery(
      'INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, cita_programada, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [vehicle_id, vehicle_name, origen, delivery.destino, delivery.tipo_entrega, delivery.destinos_json, conductor, telefono || '', req.body.remolque || '', fecha_inicio, fecha_fin, fecha_fin, notas]
    );
    const trip = await getQuery('SELECT * FROM viajes WHERE id = ?', [result.lastID]);
    const paradas = await syncTripStops(trip);
    const contactoInicial = await markInitialGeofenceContact(trip).catch(error => {
      console.error('Error marcando contacto inicial de geocerca:', error.message);
      return [];
    });
    res.json({ id: result.lastID, paradas, contactoInicial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/viajes/:id', async (req, res) => {
  try {
    const row = await getQuery('SELECT * FROM viajes WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Viaje no encontrado' });

    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    let delivery = { tipo_entrega: row.tipo_entrega, destinos_json: row.destinos_json, destino: row.destino };
    if (has('tipo_entrega') || has('destinos') || has('destino')) {
      try {
        delivery = normalizeTripDelivery(req.body, row);
      } catch (deliveryErr) {
        return res.status(400).json({ error: deliveryErr.message });
      }
    }
    const next = {
      vehicle_id: has('vehicle_id') ? req.body.vehicle_id : row.vehicle_id,
      vehicle_name: has('vehicle_name') ? req.body.vehicle_name : row.vehicle_name,
      origen: has('origen') ? req.body.origen : row.origen,
      destino: delivery.destino,
      tipo_entrega: delivery.tipo_entrega,
      destinos_json: delivery.destinos_json,
      conductor: has('conductor') ? req.body.conductor : row.conductor,
      telefono: has('telefono') ? req.body.telefono : row.telefono,
      fecha_inicio: has('fecha_inicio') ? req.body.fecha_inicio : row.fecha_inicio,
      fecha_fin: has('fecha_fin') ? req.body.fecha_fin : row.fecha_fin,
      cita_programada: has('fecha_fin') ? req.body.fecha_fin : row.fecha_fin,
      notas: has('notas') ? req.body.notas : row.notas,
      estado: has('estado') ? req.body.estado : row.estado,
      remolque: has('remolque') ? req.body.remolque : row.remolque,
    };

    const nuevoEstado = String(next.estado || '').toLowerCase();
    if ((nuevoEstado === 'completado' || nuevoEstado === 'cancelado') && !next.fecha_fin) {
      next.fecha_fin = localTimestampISO(new Date());
    }

    const result = await runQuery(
      'UPDATE viajes SET vehicle_id = ?, vehicle_name = ?, origen = ?, destino = ?, tipo_entrega = ?, destinos_json = ?, conductor = ?, telefono = ?, fecha_inicio = ?, fecha_fin = ?, cita_programada = ?, notas = ?, estado = ?, remolque = ? WHERE id = ?',
      [next.vehicle_id, next.vehicle_name, next.origen, next.destino, next.tipo_entrega, next.destinos_json, next.conductor, next.telefono, next.fecha_inicio, next.fecha_fin, next.cita_programada, next.notas, next.estado, next.remolque, req.params.id]
    );
    const paradas = await syncTripStops({ id: Number(req.params.id), ...next }, has('tipo_entrega') || has('destinos') || has('destino'));
    let trailerSync = null;
    if (TRIP_ROUTE_STATES.has(nuevoEstado)) {
      await resetTripGeofenceState(next);
    }
    const estadoPrevio = String(row.estado || '').toLowerCase();
    const viajeActivoPrevio = TRIP_TRAILER_ACTIVE_STATES.has(estadoPrevio);
    if (!viajeActivoPrevio && TRIP_TRAILER_ACTIVE_STATES.has(nuevoEstado) && (next.remolque || row.remolque)) {
      try {
        trailerSync = await syncTripTrailer({ ...next, remolque: next.remolque || row.remolque });
      } catch (syncErr) {
        if (syncErr.status === 409) return res.status(409).json({ error: syncErr.message });
        console.error('Error sincronizando remolque del viaje:', syncErr.message);
      }
    }
    res.json({ changes: result.changes, paradas, trailerSync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/viajes/:id/paradas/:paradaId', async (req, res) => {
  const estado = String(req.body?.estado || '').toLowerCase();
  if (!['pendiente', 'en_camino', 'llego', 'completada', 'omitida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de parada inválido' });
  }
  try {
    await withTransaction(async tx => {
      const stop = await tx.get('SELECT * FROM viaje_paradas WHERE id = ? AND viaje_id = ?', [req.params.paradaId, req.params.id]);
      if (!stop) throw Object.assign(new Error('Parada no encontrada'), { status: 404 });
      const now = localTimestampISO(new Date());
      const arrival = ['llego', 'completada'].includes(estado) ? (stop.hora_llegada || now) : stop.hora_llegada;
      const departure = ['completada', 'omitida'].includes(estado) ? now : stop.hora_salida;
      await tx.run(
        'UPDATE viaje_paradas SET estado = ?, hora_llegada = ?, hora_salida = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [estado, arrival || null, departure || null, stop.id]
      );
      if (['completada', 'omitida'].includes(estado)) {
        const nextStop = await tx.get("SELECT id FROM viaje_paradas WHERE viaje_id = ? AND orden > ? AND estado = 'pendiente' ORDER BY orden ASC LIMIT 1", [stop.viaje_id, stop.orden]);
        if (nextStop) await tx.run("UPDATE viaje_paradas SET estado = 'en_camino', updated_at = datetime('now') WHERE id = ?", [nextStop.id]);
      }
    });
    res.json({ paradas: await allQuery('SELECT * FROM viaje_paradas WHERE viaje_id = ? ORDER BY orden ASC', [req.params.id]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/viajes/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      await tx.run('DELETE FROM viaje_paradas WHERE viaje_id = ?', [req.params.id]);
      return (await tx.run('DELETE FROM viajes WHERE id = ?', [req.params.id])).changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/route-history', (req, res) => {
  const { vehicle_id, fecha_inicio, fecha_fin, limit: lim } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  let query = 'SELECT * FROM route_history WHERE vehicle_id = ?';
  const params = [vehicle_id];

  if (fecha_inicio) { query += ' AND recorded_at >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND recorded_at <= ?'; params.push(fecha_fin + ' 23:59:59'); }

  query += ' ORDER BY recorded_at ASC';
  if (lim) { query += ' LIMIT ?'; params.push(Number(lim)); }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/route-history/vehicles', (req, res) => {
  db.all(
    `SELECT vehicle_id, vehicle_name, COUNT(*) as total_points,
            MIN(recorded_at) as primera_ubicacion, MAX(recorded_at) as ultima_ubicacion
     FROM route_history GROUP BY vehicle_id ORDER BY ultima_ubicacion DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get('/route-history/dates', (req, res) => {
  const { vehicle_id } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  db.all(
    `SELECT DATE(recorded_at) as fecha, COUNT(*) as puntos
     FROM route_history WHERE vehicle_id = ?
     GROUP BY DATE(recorded_at) ORDER BY fecha DESC`,
    [vehicle_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.delete('/route-history', requireAdmin, (req, res) => {
  const { vehicle_id, fecha } = req.query;
  let query = 'DELETE FROM route_history WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (fecha) { query += ' AND DATE(recorded_at) = ?'; params.push(fecha); }
  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

function detectVehicleStops(rows, minimumMinutes) {
  const minimumMs = minimumMinutes * 60 * 1000;
  const maximumGapMs = 30 * 60 * 1000;
  const maximumRadiusMeters = 250;
  const stops = [];
  let candidate = null;

  const finishCandidate = () => {
    if (!candidate || candidate.endedAt - candidate.startedAt < minimumMs) {
      candidate = null;
      return;
    }
    stops.push({
      id: candidate.id,
      vehicle_id: candidate.vehicleId,
      vehicle_name: candidate.vehicleName,
      latitude: candidate.latitudeSum / candidate.samples,
      longitude: candidate.longitudeSum / candidate.samples,
      speed: 0,
      heading: candidate.heading,
      location: candidate.location,
      source_time_ms: candidate.startedAt,
      recorded_at: new Date(candidate.startedAt).toISOString(),
      stop_ended_at: new Date(candidate.endedAt).toISOString(),
      stop_duration_minutes: Math.round((candidate.endedAt - candidate.startedAt) / 60000),
      is_stop: true,
    });
    candidate = null;
  };

  for (const row of rows) {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    const timestamp = Number(row.source_time_ms);
    const speedKmh = Math.abs(Number(row.speed) || 0) * 1.609344;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(timestamp) || speedKmh >= 1) {
      finishCandidate();
      continue;
    }

    if (candidate) {
      const centerLatitude = candidate.latitudeSum / candidate.samples;
      const centerLongitude = candidate.longitudeSum / candidate.samples;
      const gapMs = timestamp - candidate.endedAt;
      const distance = haversineDistance(centerLatitude, centerLongitude, latitude, longitude);
      if (gapMs < 0 || gapMs > maximumGapMs || distance > maximumRadiusMeters) finishCandidate();
    }

    if (!candidate) {
      candidate = {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicleName: row.vehicle_name,
        latitudeSum: latitude,
        longitudeSum: longitude,
        samples: 1,
        heading: row.heading,
        location: row.location,
        startedAt: timestamp,
        endedAt: timestamp,
      };
    } else {
      candidate.latitudeSum += latitude;
      candidate.longitudeSum += longitude;
      candidate.samples += 1;
      candidate.endedAt = timestamp;
      if (row.location) candidate.location = row.location;
    }
  }
  finishCandidate();
  return stops;
}

router.get('/route-history/last', (req, res) => {
  const { vehicle_id, hours, stops_minutes: stopsMinutes, since_ms: sinceMs, include_route: includeRouteValue } = req.query;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  const h = Math.min(168, Math.max(1, Number(hours) || 24));
  const minimumStopMinutes = stopsMinutes === undefined ? null : Math.min(1440, Math.max(1, Number(stopsMinutes) || 20));
  const includeRoute = includeRouteValue === '1' || includeRouteValue === 'true';
  const earliestAllowed = Date.now() - 168 * 60 * 60 * 1000;
  const requestedSince = Number(sinceMs);
  const lowerBoundMs = Number.isFinite(requestedSince) && requestedSince > 0
    ? Math.max(earliestAllowed, Math.min(Date.now(), requestedSince))
    : Date.now() - h * 60 * 60 * 1000;
  const select = minimumStopMinutes
    ? `SELECT MIN(id) AS id, vehicle_id, MAX(vehicle_name) AS vehicle_name,
              AVG(latitude) AS latitude, AVG(longitude) AS longitude,
              MAX(ABS(COALESCE(speed, 0))) AS speed, MAX(heading) AS heading,
              MAX(location) AS location, MIN(source_time_ms) AS source_time_ms
       FROM route_history
       WHERE vehicle_id = ? AND source_time_ms IS NOT NULL
         AND source_time_ms >= ?
       GROUP BY CAST(source_time_ms / 60000 AS INTEGER)
       ORDER BY source_time_ms ASC`
    : `SELECT * FROM route_history
       WHERE vehicle_id = ? AND recorded_at >= datetime('now', '-' || ? || ' hours')
       ORDER BY recorded_at ASC`;
  db.all(
    select,
    [vehicle_id, minimumStopMinutes ? lowerBoundMs : h],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!minimumStopMinutes) return res.json(rows || []);
      const stops = detectVehicleStops(rows || [], minimumStopMinutes);
      if (!includeRoute) return res.json(stops);
      const route = (rows || []).map(row => ({
        ...row,
        recorded_at: new Date(Number(row.source_time_ms)).toISOString(),
      }));
      res.json({ route, stops });
    }
  );
});

router.get('/viajes/activos', async (req, res) => {
  try {
    const rows = await allQuery(
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
    res.json(await attachTripStops(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
