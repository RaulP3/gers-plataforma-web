const crypto = require('crypto');
const { IS_PRODUCTION, TRIP_ROUTE_STATES, GEOFENCE_EXIT_GRACE_MIN } = require('../config');
const { getQuery, allQuery, runQuery } = require('../db');
const { broadcastLiveUpdate } = require('../cache');
const { localTimestampISO, normalizeDestination, parseFechaLocal } = require('../utils');
const { fetchSamsaraVehicleLocations, fetchSamsaraAddresses } = require('./samsara');
const {
  getViaje,
  getParada,
  updateParada,
  getNextPendingStop,
  getNextEnCaminoStop,
  getRestantesNotCompleted,
  getActiveTripsForVehicle,
  getCandidateStopsForVehicle,
  listParadas,
} = require('../models/viajes');
const {
  listActiveLocalGeofences,
  listAllGeofenceStates,
  upsertVehicleGeofenceState,
  resetGeofenceState,
  insertGeofenceEvent,
  getLastGeofenceExitForDestination,
  findSamsaraGeofenceClient,
  listClienteGeofenceLinks,
} = require('../models/geofences');
const { createAlertRecord, getRecentCustomerGeofenceAlert } = require('../models/alertas');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInsidePolygon(latitude, longitude, polygon) {
  const vertices = Array.isArray(polygon) ? polygon : polygon?.vertices;
  if (!Array.isArray(vertices) || vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const yi = Number(vertices[i]?.latitude);
    const xi = Number(vertices[i]?.longitude);
    const yj = Number(vertices[j]?.latitude);
    const xj = Number(vertices[j]?.longitude);
    if (![yi, xi, yj, xj].every(Number.isFinite)) continue;
    const intersects = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInsideGeofence(latitude, longitude, geofence) {
  if (geofence.polygon) return pointInsidePolygon(latitude, longitude, geofence.polygon);
  const centerLat = Number(geofence.latitud);
  const centerLon = Number(geofence.longitud);
  const radius = Number(geofence.radio_metros);
  if (![latitude, longitude, centerLat, centerLon, radius].every(Number.isFinite)) return false;
  return haversineDistance(latitude, longitude, centerLat, centerLon) <= radius;
}

async function loadAllGeofences() {
  const localGeofences = await listActiveLocalGeofences();
  let samsaraGeofences = [];
  try {
    samsaraGeofences = await fetchSamsaraAddresses();
  } catch (error) {
    console.error('Error fetching Samsara geofences:', error.message);
  }
  const samsaraClientLinks = await allQuery(
    `SELECT link.geofence_ref, c.id AS cliente_id, c.nombre AS cliente_nombre
     FROM cliente_geofence_links link JOIN clientes c ON c.id = link.cliente_id
     WHERE link.source = 'samsara'`
  );
  return [
    ...localGeofences.map(g => ({ ...g, stateId: String(g.id), eventId: g.id, source: 'local' })),
    ...samsaraGeofences.map(g => ({
      ...g,
      stateId: `samsara:${g.id || `${g.nombre}:${g.latitud}:${g.longitud}`}`,
      eventId: `samsara:${g.id || `${g.nombre}:${g.latitud}:${g.longitud}`}`,
      source: 'samsara',
      ...(samsaraClientLinks.find(link => String(link.geofence_ref) === String(g.id)) || {}),
    })),
  ];
}

async function getTripContactForGeofence(vehicle, geofenceName, tripIdHint = null) {
  const normalizedGeofence = normalizeDestination(geofenceName);
  if (!normalizedGeofence || (!vehicle?.id && !vehicle?.name)) return null;
  const { syncTripStops } = require('./viajes');
  const params = [String(vehicle.id || ''), String(vehicle.name || '')];
  let activeTrips = await getActiveTripsForVehicle(vehicle.id, vehicle.name);
  if (tripIdHint) activeTrips = activeTrips.filter(trip => Number(trip.id) === Number(tripIdHint));
  for (const trip of activeTrips) {
    if (trip.tipo_entrega === 'reparto') await syncTripStops(trip);
  }
  let candidates = await getCandidateStopsForVehicle(vehicle.id, vehicle.name);
  if (tripIdHint) candidates = candidates.filter(candidate => Number(candidate.viaje_id) === Number(tripIdHint));
  const stop = candidates.find(candidate => normalizeDestination(candidate.destino) === normalizedGeofence);
  const directTrip = activeTrips.find(trip => trip.tipo_entrega !== 'reparto' && normalizeDestination(trip.destino) === normalizedGeofence && String(trip.estado || '').toLowerCase() !== 'completado')
    || activeTrips.find(trip => trip.tipo_entrega !== 'reparto' && normalizeDestination(trip.destino) === normalizedGeofence);
  const trip = (stop ? activeTrips.find(t => t.id === stop.viaje_id) : null) || directTrip || null;
  return { stop, trip, directTrip };
}

async function tripContactIsProgramado(vehicle, geofenceName, tripIdHint = null) {
  try {
    const contact = await getTripContactForGeofence(vehicle, geofenceName, tripIdHint);
    return !!(contact?.trip && String(contact.trip.estado || '').toLowerCase() === 'programado');
  } catch (error) {
    console.error('Error verificando estado del viaje para geocerca:', error.message);
    return false;
  }
}

async function updateTripStopFromGeofence(vehicle, geofenceName, type, eventTime = localTimestampISO(new Date()), tripIdHint = null) {
  const contact = await getTripContactForGeofence(vehicle, geofenceName, tripIdHint);
  if (!contact) return null;
  const { stop, trip, directTrip } = contact;
  const tripId = stop?.viaje_id || directTrip?.id;
  const estadoActual = String(trip?.estado || '').toLowerCase();

  if (estadoActual === 'programado') {
    return stop ? getParada(stop.id) : null;
  }

  if (type === 'entrada') {
    if (stop) {
      if (stop.estado === 'omitida') return stop;
      if (stop.estado === 'completada') {
        await runQuery(
          `UPDATE viaje_paradas
              SET estado = 'llego', hora_salida = NULL, updated_at = datetime('now')
            WHERE id = ?`,
          [stop.id]
        );
        const nextStop = await getNextEnCaminoStop(stop.viaje_id, stop.orden);
        if (nextStop) await runQuery("UPDATE viaje_paradas SET estado = 'pendiente', updated_at = datetime('now') WHERE id = ?", [nextStop.id]);
      } else {
        await updateParada(stop.id, {
          estado: 'llego',
          hora_llegada: stop.hora_llegada || eventTime,
          hora_salida: null,
        });
      }
    }
    if (tripId) {
      if (estadoActual === 'completado') {
        await runQuery("UPDATE viajes SET estado = 'espera_ingreso', fecha_fin = NULL, estado_previo = NULL, hora_llegada = COALESCE(hora_llegada, ?), hora_salida = NULL, updated_at = datetime('now') WHERE id = ?", [eventTime, tripId]);
      } else if (TRIP_ROUTE_STATES.has(estadoActual)) {
        await runQuery("UPDATE viajes SET estado_previo = ?, estado = 'espera_ingreso', hora_llegada = COALESCE(hora_llegada, ?), hora_salida = NULL, updated_at = datetime('now') WHERE id = ?", [estadoActual, eventTime, tripId]);
      } else if (estadoActual === 'espera_ingreso') {
        await runQuery("UPDATE viajes SET hora_llegada = COALESCE(hora_llegada, ?), hora_salida = NULL, updated_at = datetime('now') WHERE id = ?", [eventTime, tripId]);
      }
    }
  } else if (type === 'salida' && stop && stop.hora_llegada && stop.estado !== 'omitida') {
    if (stop.estado !== 'completada') {
      await updateParada(stop.id, { estado: 'llego', hora_llegada: stop.hora_llegada, hora_salida: eventTime });
    }
  } else if (type === 'salida' && directTrip) {
    await runQuery("UPDATE viajes SET hora_salida = COALESCE(hora_salida, ?), updated_at = datetime('now') WHERE id = ?", [eventTime, directTrip.id]);
  }
  return stop ? getParada(stop.id) : null;
}

function vehicleOutsideAllMatching(insideMap, vehicleId, destino, geofences) {
  const targets = geofences.filter(g => normalizeDestination(g.nombre) === normalizeDestination(destino));
  if (!targets.length) return true;
  return targets.every(g => {
    const state = insideMap[`${vehicleId}_${g.stateId}`];
    return !state || state.inside !== 1;
  });
}

async function resolveTripFechaFin(trip) {
  if (!trip?.destino) return null;
  const last = await getLastGeofenceExitForDestination({
    vehicle_id: trip.vehicle_id,
    vehicle_name: trip.vehicle_name,
    destino: trip.destino,
  });
  if (last?.tipo === 'salida' && last.created_at) return last.created_at;
  if (String(trip.tipo_entrega || '').toLowerCase() === 'reparto' && trip.id) {
    const stops = await listParadas(trip.id);
    const lastStop = stops[stops.length - 1];
    if (lastStop?.hora_salida) return lastStop.hora_salida;
  } else if (trip.hora_salida) {
    return trip.hora_salida;
  }
  return null;
}

async function finalizeDepartedAfterGrace(geofences, now = new Date()) {
  const graceMs = GEOFENCE_EXIT_GRACE_MIN * 60 * 1000;
  const states = await listAllGeofenceStates();
  const insideMap = {};
  for (const s of states) insideMap[`${s.vehicle_id}_${s.geofence_id}`] = s;
  const finalized = [];

  const stops = await allQuery(
    `SELECT vp.id, vp.viaje_id, vp.orden, vp.estado, vp.hora_salida, vp.destino,
            v.vehicle_id, v.vehicle_name, v.estado AS viaje_estado, v.estado_previo
       FROM viaje_paradas vp JOIN viajes v ON v.id = vp.viaje_id
      WHERE vp.estado = 'llego' AND vp.hora_salida IS NOT NULL
        AND v.estado NOT IN ('completado', 'cancelado')`
  );

  for (const stop of stops) {
    const salida = parseFechaLocal(stop.hora_salida);
    if (!salida || (now.getTime() - salida.getTime()) < graceMs) continue;
    if (!vehicleOutsideAllMatching(insideMap, stop.vehicle_id, stop.destino, geofences)) continue;
    await runQuery("UPDATE viaje_paradas SET estado = 'completada', updated_at = datetime('now') WHERE id = ?", [stop.id]);
    if (String(stop.viaje_estado).toLowerCase() === 'espera_ingreso') {
      const nextStop = await getNextPendingStop(stop.viaje_id, stop.orden);
      if (nextStop) await runQuery("UPDATE viaje_paradas SET estado = 'en_camino', updated_at = datetime('now') WHERE id = ?", [nextStop.id]);
      const restantes = await getRestantesNotCompleted(stop.viaje_id);
      if (restantes.length === 0) {
        await runQuery("UPDATE viajes SET estado = 'completado', fecha_fin = ?, estado_previo = NULL, updated_at = datetime('now') WHERE id = ?", [stop.hora_salida, stop.viaje_id]);
      } else {
        const previo = String(stop.estado_previo || 'en_ruta_cargado');
        await runQuery("UPDATE viajes SET estado = ?, estado_previo = NULL, updated_at = datetime('now') WHERE id = ?", [previo, stop.viaje_id]);
      }
    }
    finalized.push({ tipo: 'parada', viaje_id: stop.viaje_id, parada_id: stop.id, destino: stop.destino });
  }

  const directTrips = await allQuery(
    `SELECT id, vehicle_id, destino, estado, estado_previo, hora_salida
       FROM viajes
      WHERE tipo_entrega <> 'reparto' AND estado = 'espera_ingreso' AND hora_salida IS NOT NULL`
  );
  for (const trip of directTrips) {
    const salida = parseFechaLocal(trip.hora_salida);
    if (!salida || (now.getTime() - salida.getTime()) < graceMs) continue;
    if (!vehicleOutsideAllMatching(insideMap, trip.vehicle_id, trip.destino, geofences)) continue;
    await runQuery("UPDATE viajes SET estado = 'completado', fecha_fin = ?, estado_previo = NULL, updated_at = datetime('now') WHERE id = ?", [trip.hora_salida, trip.id]);
    finalized.push({ tipo: 'viaje', viaje_id: trip.id, destino: trip.destino });
  }

  if (finalized.length) {
    console.log(`[geofences] Finalizados tras periodo de gracia (${GEOFENCE_EXIT_GRACE_MIN} min):`, finalized);
  }
  return finalized;
}

async function resetTripGeofenceState(trip) {
  try {
    const geofences = await loadAllGeofences();
    const { tripDestinations } = require('./viajes');
    const destinations = trip.tipo_entrega === 'reparto'
      ? tripDestinations(trip)
      : (trip.destino ? [trip.destino] : []);
    if (!destinations.length) return;
    const targets = geofences.filter(g => destinations.some(d => normalizeDestination(g.nombre) === normalizeDestination(d)));
    const vehicleId = String(trip.vehicle_id || '');
    for (const g of targets) {
      await resetGeofenceState(vehicleId, g.stateId);
    }
  } catch (err) {
    console.error('Error reseteando estado de geocerca del viaje:', err.message);
  }
}

async function createCustomerGeofenceAlert(vehicle, client, geofenceName, eventTime = localTimestampISO(new Date())) {
  if (!client?.id) return null;
  const vehicleId = String(vehicle.id || '');
  const vehicleName = vehicle.name || vehicleId;
  const message = `${vehicleName} entró a "${geofenceName}" del cliente "${client.nombre}"`;
  const recent = await getRecentCustomerGeofenceAlert(vehicleId, message);
  if (recent) return recent;
  const result = await runQuery(
    'INSERT INTO alertas (vehicle_id, vehicle_name, tipo, mensaje, severidad, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [vehicleId, vehicleName, 'cliente_geocerca', message, 'alta', eventTime]
  );
  const alert = await getQuery('SELECT * FROM alertas WHERE id = ?', [result.lastID]);
  broadcastLiveUpdate('client-geofence-alert', { alert });
  return alert;
}

async function markInitialGeofenceContact(trip) {
  const contacts = [];
  if (String(trip?.estado || '').toLowerCase() === 'programado') return contacts;
  const vehicleId = String(trip.vehicle_id || '');
  const vehicleName = String(trip.vehicle_name || '');
  if (!vehicleId && !vehicleName) return contacts;

  let vehicle = null;
  try {
    const vehicles = await fetchSamsaraVehicleLocations();
    vehicle = vehicles.find(v => String(v.id) === vehicleId || String(v.name || '') === vehicleName) || null;
  } catch (error) {
    console.error('Error obteniendo ubicación para contacto inicial:', error.message);
  }
  if (!vehicle?.location) return contacts;

  const geofences = await loadAllGeofences();
  const { tripDestinations } = require('./viajes');
  const destinations = trip.tipo_entrega === 'reparto'
    ? tripDestinations(trip)
    : (trip.destino ? [trip.destino] : []);

  for (const destination of destinations) {
    const matching = geofences.filter(g => normalizeDestination(g.nombre) === normalizeDestination(destination));
    const geofence = matching.find(g => pointInsideGeofence(vehicle.location.latitude, vehicle.location.longitude, g));
    if (!geofence) continue;
    const eventTime = localTimestampISO(new Date());
    await insertGeofenceEvent({
      vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      geofence_id: geofence.eventId,
      geofence_nombre: geofence.nombre,
      tipo: 'entrada',
      latitud: vehicle.location.latitude,
      longitud: vehicle.location.longitude,
      source: geofence.source,
    });
    if (geofence.cliente_id) {
      await createCustomerGeofenceAlert(vehicle, { id: geofence.cliente_id, nombre: geofence.cliente_nombre }, geofence.nombre);
    } else {
      await createAlertRecord({
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        tipo: 'geocerca',
        mensaje: `${vehicle.name} entró a la geocerca "${geofence.nombre}"`,
        severidad: 'info',
      });
    }
    await updateTripStopFromGeofence(vehicle, geofence.nombre, 'entrada', eventTime, trip?.id);
    await upsertVehicleGeofenceState(vehicle.id, geofence.stateId, true);
    contacts.push({ vehicle: vehicle.name, geofence: geofence.nombre, latitud: vehicle.location.latitude, longitud: vehicle.location.longitud });
  }
  return contacts;
}

function validWebhookSignature(req) {
  const secret = process.env.SAMSARA_WEBHOOK_SECRET;
  if (!secret) return !IS_PRODUCTION;
  const timestamp = String(req.headers['x-samsara-timestamp'] || '');
  const supplied = String(req.headers['x-samsara-signature'] || '');
  if (!timestamp || !/^v1=[a-f0-9]{64}$/i.test(supplied) || !Buffer.isBuffer(req.rawBody)) return false;
  const message = Buffer.concat([Buffer.from(`v1:${timestamp}:`), req.rawBody]);
  const digest = crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(message).digest('hex');
  const expected = `v1=${digest}`;
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

async function handleSamsaraWebhook(req) {
  if (!validWebhookSignature(req)) {
    const error = new Error('Firma de webhook inválida');
    error.status = 401;
    throw error;
  }
  const payload = req.body || {};
  const eventType = payload.eventType;
  const standardEvent = eventType === 'Alert' ? (payload.event || {}) : null;
  const standardCondition = standardEvent?.alertConditionId;
  const isStandardGeofence = ['DeviceLocationInsideGeofence', 'DeviceLocationOutsideGeofence'].includes(standardCondition);
  const isLegacyGeofence = ['GeofenceEntry', 'GeofenceExit'].includes(eventType);
  if (!isStandardGeofence && !isLegacyGeofence) {
    return { ok: true, ignored: true };
  }

  const data = payload.data || {};
  const address = data.address || {};
  const geofence = address.geofence || {};
  const vehicle = isStandardGeofence ? (standardEvent.device || standardEvent.vehicle || {}) : (data.vehicle || {});
  const eventTime = isStandardGeofence
    ? (standardEvent.startMs || payload.eventMs || Date.now())
    : (payload.eventTime || Date.now());
  const createdAt = localTimestampISO(new Date(eventTime));
  const tipo = (eventType === 'GeofenceEntry' || standardCondition === 'DeviceLocationInsideGeofence') ? 'entrada' : 'salida';
  const details = String(standardEvent?.details || standardEvent?.summary || '');
  const geofenceMatch = details.match(/\b(?:inside|outside)\s+(.+?)(?:\s+for more than\s+\d+\s+minutes)?\.?$/i);
  const geofenceName = isStandardGeofence ? (geofenceMatch?.[1] || 'Geocerca Samsara') : (address.name || 'Geocerca Samsara');
  const geofenceId = isStandardGeofence ? null : (address.id || null);
  const latitud = isStandardGeofence ? (standardEvent.location?.latitude ?? null) : (geofence.circle?.latitude ?? null);
  const longitud = isStandardGeofence ? (standardEvent.location?.longitude ?? null) : (geofence.circle?.longitude ?? null);

  if (await tripContactIsProgramado(vehicle, geofenceName)) {
    return { ok: true, saved: false, ignored: true, reason: 'viaje_programado' };
  }

  const result = await insertGeofenceEvent({
    vehicle_id: vehicle.id || '',
    vehicle_name: vehicle.name || '',
    geofence_id: geofenceId,
    geofence_nombre: geofenceName,
    tipo,
    latitud,
    longitud,
    source: 'samsara',
    event_uid: payload.eventId ? String(payload.eventId) : null,
    raw_payload: JSON.stringify(payload),
    created_at: createdAt,
  });
  const saved = result.changes > 0;
  if (saved) {
    updateTripStopFromGeofence(vehicle, geofenceName, tipo, createdAt).catch(updateErr => {
      console.error('Error actualizando parada desde webhook:', updateErr.message);
    });
    if (tipo === 'entrada') {
      findSamsaraGeofenceClient(geofenceId, geofenceName)
        .then(client => createCustomerGeofenceAlert(vehicle, client, geofenceName, createdAt))
        .catch(alertErr => console.error('Error creando alerta de cliente:', alertErr.message));
    }
  }
  return { ok: true, saved };
}

async function performGeofenceCheck() {
    const geofences = await loadAllGeofences();

    const prevStates = await listAllGeofenceStates();
    const prevMap = {};
    for (const p of prevStates) {
      prevMap[`${p.vehicle_id}_${p.geofence_id}`] = p;
    }

    const alerts = [];
    const vehicles = await fetchSamsaraVehicleLocations();

    for (const v of vehicles) {
      if (!v.location) continue;
      const vLat = v.location.latitude;
      const vLon = v.location.longitude;

      for (const g of geofences) {
        const inside = pointInsideGeofence(vLat, vLon, g);
        const key = `${v.id}_${g.stateId}`;
        const prev = prevMap[key];
        const wasInside = prev ? prev.inside === 1 : false;

        if (inside && !wasInside) {
          if (!(await tripContactIsProgramado(v, g.nombre))) {
            await insertGeofenceEvent({
              vehicle_id: v.id,
              vehicle_name: v.name,
              geofence_id: g.eventId,
              geofence_nombre: g.nombre,
              tipo: 'entrada',
              latitud: vLat,
              longitud: vLon,
              source: g.source,
            });
            if (g.cliente_id) {
              await createCustomerGeofenceAlert(v, { id: g.cliente_id, nombre: g.cliente_nombre }, g.nombre);
            } else {
              await createAlertRecord({
                vehicle_id: v.id,
                vehicle_name: v.name,
                tipo: 'geocerca',
                mensaje: `${v.name} entró a la geocerca "${g.nombre}"`,
                severidad: 'info',
              });
            }
            await updateTripStopFromGeofence(v, g.nombre, 'entrada');
            alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'entrada' });
          }
        } else if (!inside && wasInside) {
          if (!(await tripContactIsProgramado(v, g.nombre))) {
            await insertGeofenceEvent({
              vehicle_id: v.id,
              vehicle_name: v.name,
              geofence_id: g.eventId,
              geofence_nombre: g.nombre,
              tipo: 'salida',
              latitud: vLat,
              longitud: vLon,
              source: g.source,
            });
            await createAlertRecord({
              vehicle_id: v.id,
              vehicle_name: v.name,
              tipo: 'geocerca',
              mensaje: `${v.name} salió de la geocerca "${g.nombre}"`,
              severidad: 'info',
            });
            await updateTripStopFromGeofence(v, g.nombre, 'salida');
            alerts.push({ vehicle: v.name, geofence: g.nombre, tipo: 'salida' });
          }
        }

        if (!prev || wasInside !== inside) {
          await upsertVehicleGeofenceState(v.id, g.stateId, inside);
        }
      }
    }

    await finalizeDepartedAfterGrace(geofences);

    return { checked: vehicles.length, geofences: geofences.length, newAlerts: alerts.length, alerts };
}

let geofenceCheckInFlight = null;
function checkGeofences() {
  if (!geofenceCheckInFlight) {
    geofenceCheckInFlight = performGeofenceCheck().finally(() => { geofenceCheckInFlight = null; });
  }
  return geofenceCheckInFlight;
}

module.exports = {
  haversineDistance,
  pointInsidePolygon,
  pointInsideGeofence,
  loadAllGeofences,
  tripContactIsProgramado,
  updateTripStopFromGeofence,
  vehicleOutsideAllMatching,
  finalizeDepartedAfterGrace,
  resolveTripFechaFin,
  resetTripGeofenceState,
  markInitialGeofenceContact,
  validWebhookSignature,
  handleSamsaraWebhook,
  performGeofenceCheck,
  checkGeofences,
};
