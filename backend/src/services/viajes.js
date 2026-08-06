const crypto = require('crypto');
const { allQuery, runQuery, withTransaction } = require('../db');
const { normalizeDestination } = require('../utils');

function normalizeTripDelivery(body, current = null) {
  const has = key => Object.prototype.hasOwnProperty.call(body || {}, key);
  const tipoEntrega = has('tipo_entrega') ? body.tipo_entrega : (current?.tipo_entrega || 'directo');
  if (!['directo', 'reparto'].includes(tipoEntrega)) {
    throw new Error('tipo_entrega debe ser directo o reparto');
  }

  let suppliedDestinations;
  if (has('destinos')) {
    if (!Array.isArray(body.destinos)) throw new Error('destinos debe ser un arreglo');
    suppliedDestinations = body.destinos;
  } else if (current?.destinos_json) {
    try {
      suppliedDestinations = JSON.parse(current.destinos_json);
    } catch {
      suppliedDestinations = [];
    }
  } else {
    suppliedDestinations = [];
  }
  if (!Array.isArray(suppliedDestinations)) throw new Error('destinos debe ser un arreglo');

  const destinos = suppliedDestinations.map(value => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('destinos no puede contener valores vacíos');
    return value.trim().replace(/\s+/g, ' ');
  });
  if (new Set(destinos.map(normalizeDestination)).size !== destinos.length) {
    throw new Error('destinos debe contener destinos distintos');
  }

  if (tipoEntrega === 'reparto') {
    if (destinos.length < 2) throw new Error('reparto requiere al menos 2 destinos');
    return { tipo_entrega: tipoEntrega, destinos_json: JSON.stringify(destinos), destino: destinos[destinos.length - 1] };
  }

  if (destinos.length > 1) throw new Error('directo admite máximo un destino');
  const legacyDestination = has('destino') ? body.destino : (destinos[0] ?? current?.destino);
  if (legacyDestination !== null && legacyDestination !== undefined && typeof legacyDestination !== 'string') {
    throw new Error('destino debe ser texto');
  }
  const destino = typeof legacyDestination === 'string' ? legacyDestination.trim().replace(/\s+/g, ' ') : legacyDestination;
  return { tipo_entrega: tipoEntrega, destinos_json: JSON.stringify(destino ? [destino] : []), destino };
}

function tripDestinations(trip) {
  if (trip?.tipo_entrega !== 'reparto') return [];
  try {
    const values = JSON.parse(trip.destinos_json || '[]');
    return Array.isArray(values) ? values.map(value => String(value || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function syncTripStops(trip, force = false) {
  const destinations = tripDestinations(trip);
  const existing = await allQuery('SELECT * FROM viaje_paradas WHERE viaje_id = ? ORDER BY orden ASC', [trip.id]);
  if (destinations.length === 0) {
    if (existing.length) await runQuery('DELETE FROM viaje_paradas WHERE viaje_id = ?', [trip.id]);
    return [];
  }
  const unchanged = existing.length === destinations.length && existing.every((stop, index) => normalizeDestination(stop.destino) === normalizeDestination(destinations[index]));
  if (unchanged) return existing;

  await runQuery('DELETE FROM viaje_paradas WHERE viaje_id = ?', [trip.id]);
  const usedIds = new Set();
  for (let index = 0; index < destinations.length; index += 1) {
    const destination = destinations[index];
    const preserved = existing.find(stop => !usedIds.has(stop.id) && normalizeDestination(stop.destino) === normalizeDestination(destination));
    if (preserved) usedIds.add(preserved.id);
    const estado = preserved?.estado || (index === 0 ? 'en_camino' : 'pendiente');
    const horaProgramada = index === 0 ? (trip.fecha_fin || preserved?.hora_programada || null) : (preserved?.hora_programada || null);
    await runQuery(
      `INSERT INTO viaje_paradas (viaje_id, orden, destino, estado, hora_llegada, hora_salida, hora_programada, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [trip.id, index + 1, destination, estado, preserved?.hora_llegada || null, preserved?.hora_salida || null, horaProgramada]
    );
  }
  return allQuery('SELECT * FROM viaje_paradas WHERE viaje_id = ? ORDER BY orden ASC', [trip.id]);
}

async function attachTripStops(rows) {
  for (const trip of rows) await syncTripStops(trip);
  if (!rows.length) return rows;
  const placeholders = rows.map(() => '?').join(',');
  const stops = await allQuery(`SELECT * FROM viaje_paradas WHERE viaje_id IN (${placeholders}) ORDER BY viaje_id, orden`, rows.map(row => row.id));
  return rows.map(trip => ({ ...trip, paradas: stops.filter(stop => stop.viaje_id === trip.id) }));
}

async function resolveTripTrailerIds(remolqueValue) {
  const text = String(remolqueValue || '').trim();
  if (!text) return [];
  const numbers = text.split('+').map(part => String(part).replace(/[#\s]/g, '').trim()).filter(Boolean);
  if (!numbers.length) return [];
  const placeholders = numbers.map(() => '?').join(',');
  const rows = await allQuery(`SELECT id, numero FROM remolques WHERE numero IN (${placeholders})`, numbers);
  if (rows.length !== numbers.length) return [];
  return rows.map(row => row.id);
}

async function syncTripTrailer(trip) {
  const ids = await resolveTripTrailerIds(trip.remolque);
  if (!ids.length) return null;
  const isFull = ids.length > 1;
  const vehicleId = trip.vehicle_id;
  const vehicleName = String(trip.vehicle_name || '');
  return withTransaction(async tx => {
    const current = await tx.all('SELECT remolque_id FROM remolque_asignaciones WHERE activa = 1 AND vehicle_id = ?', [vehicleId]);
    const currentIds = current.map(row => row.remolque_id);
    const same = ids.length === currentIds.length && ids.every(id => currentIds.includes(id));
    if (same) return null;
    if (isFull) {
      const elsewhere = await tx.get(
        'SELECT id FROM remolque_asignaciones WHERE activa = 1 AND remolque_id IN (?, ?) AND vehicle_id <> ? LIMIT 1',
        [ids[0], ids[1], vehicleId]
      );
      if (elsewhere) {
        const error = new Error('Uno de los tanques ya está asignado a otra unidad');
        error.status = 409;
        throw error;
      }
    }
    const placeholders = ids.map(() => '?').join(',');
    const displaced = await tx.all(
      `SELECT DISTINCT remolque_id FROM remolque_asignaciones
       WHERE activa = 1 AND (vehicle_id = ? OR remolque_id IN (${placeholders}))`,
      [vehicleId, ...ids]
    );
    await tx.run(
      `UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP
       WHERE activa = 1 AND (vehicle_id = ? OR remolque_id IN (${placeholders}))`,
      [vehicleId, ...ids]
    );
    for (const row of displaced) {
      await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', row.remolque_id]);
    }
    const grupoFull = isFull ? crypto.randomUUID() : null;
    const tipo = isFull ? 'full' : 'sencillo';
    for (const id of ids) {
      await tx.run(
        `INSERT INTO remolque_asignaciones (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
         VALUES (?, ?, ?, ?, ?)`,
        [id, vehicleId, vehicleName, tipo, grupoFull]
      );
      await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['asignado', id]);
    }
    return { tipo_asignacion: tipo, grupo_full: grupoFull, remolque_ids: ids };
  });
}

module.exports = {
  normalizeTripDelivery,
  tripDestinations,
  syncTripStops,
  attachTripStops,
  resolveTripTrailerIds,
  syncTripTrailer,
};
