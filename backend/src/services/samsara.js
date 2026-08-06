const axios = require('axios');
const { SAMSARA_API_BASE_URL } = require('../config');
const { db } = require('../db');
const { saveVehicleLocation, insertRouteHistoryPoint, insertTrailerLocation, listTrailerLocations } = require('../models/vehicles');

const samsaraApi = axios.create({
  baseURL: `${SAMSARA_API_BASE_URL}/v1`,
  timeout: 15000,
  headers: {
    'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function fetchSamsaraDrivers() {
  let allDrivers = [];
  let after = null;

  do {
    const params = after ? { after } : {};
    const driversRes = await axios.get(`${SAMSARA_API_BASE_URL}/fleet/drivers`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params,
      timeout: 15000,
    });
    const batch = driversRes.data.data || [];
    allDrivers = allDrivers.concat(batch);
    after = driversRes.data.pagination?.endCursor || null;
  } while (after);

  return allDrivers;
}

async function endOngoingSamsaraAssignment(vehicleId) {
  const headers = { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' };
  const res = await axios.get('https://api.samsara.com/fleet/driver-vehicle-assignments', {
    headers,
    params: { filterBy: 'vehicles', vehicleIds: String(vehicleId), startTime: '1970-01-01T00:00:00Z', assignmentType: 'external' },
    timeout: 15000,
  });
  const ongoing = (res.data.data || []).filter(a => !a.endTime);
  for (const a of ongoing) {
    await axios.patch('https://api.samsara.com/fleet/driver-vehicle-assignments', {
      driverId: a.driver.id,
      vehicleId: a.vehicle.id,
      startTime: a.startTime,
      endTime: new Date().toISOString(),
    }, { headers, timeout: 15000 });
  }
}

async function syncOperatorToSamsara(vehicleId, operatorName, driverIdSamsara) {
  if (!process.env.SAMSARA_API_TOKEN) {
    return { ok: false, skipped: true, message: 'Token de Samsara no configurado' };
  }

  let driverId = driverIdSamsara || '';
  if (!driverId && operatorName) {
    try {
      const drivers = await fetchSamsaraDrivers();
      const match = drivers.find(d => d.name && d.name.toLowerCase() === operatorName.trim().toLowerCase());
      if (match) driverId = match.id;
    } catch (e) {
      return { ok: false, message: `No se pudo buscar el operador en Samsara: ${e.response?.data?.message || e.message}` };
    }
  }

  const headers = { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' };
  try {
    await endOngoingSamsaraAssignment(vehicleId);
  } catch (e) {
    return { ok: false, message: `No se pudo actualizar la asignación vigente en Samsara: ${e.response?.data?.message || e.message}` };
  }

  if (!driverId) {
    if (!operatorName) return { ok: true, message: 'Operador retirado correctamente de Samsara' };
    return { ok: false, message: `No se encontró al operador "${operatorName}" en Samsara` };
  }

  try {
    await axios.post('https://api.samsara.com/fleet/driver-vehicle-assignments', {
      driverId,
      vehicleId: String(vehicleId),
      startTime: new Date().toISOString(),
    }, { headers, timeout: 15000 });
    return { ok: true, message: 'Operador asignado en Samsara correctamente' };
  } catch (e) {
    return { ok: false, message: `Samsara rechazó la asignación: ${e.response?.data?.message || e.message}` };
  }
}

async function fetchSamsaraVehicleLocations() {
  const vehicles = [];
  let after = null;
  do {
    const locRes = await axios.get(`${SAMSARA_API_BASE_URL}/fleet/vehicles/locations`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: after ? { after } : {},
      timeout: 15000,
    });
    const data = locRes.data || {};
    vehicles.push(...(Array.isArray(data.data) ? data.data : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return vehicles;
}

function mapSamsaraAddress(address) {
  const circle = address.geofence?.circle || {};
  return {
    id: address.id,
    nombre: address.name || address.formattedAddress || 'Sin nombre',
    latitud: circle.latitude ?? address.latitude,
    longitud: circle.longitude ?? address.longitude,
    radio_metros: circle.radiusMeters || 500,
    descripcion: address.formattedAddress || '',
    color: '#8b5cf6',
    categoria: 'samsara',
    activa: 1,
    polygon: address.geofence?.polygon || null,
  };
}

async function fetchSamsaraAddresses() {
  const addresses = [];
  let after = null;
  do {
    const addressRes = await axios.get(`${SAMSARA_API_BASE_URL}/addresses`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: after ? { after } : {},
      timeout: 15000,
    });
    const data = addressRes.data || {};
    const batch = data.addresses || (Array.isArray(data) ? data : (data.data || []));
    addresses.push(...(Array.isArray(batch) ? batch : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return addresses.map(mapSamsaraAddress);
}

async function fetchSamsaraTrailerLocations() {
  const trailers = [];
  let after = null;
  do {
    const locRes = await axios.get(`${SAMSARA_API_BASE_URL}/beta/fleet/trailers/stats`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: { types: 'gps', ...(after ? { after } : {}) },
      timeout: 15000,
    });
    const data = locRes.data || {};
    trailers.push(...(Array.isArray(data.data) ? data.data : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return trailers;
}

async function fetchSamsaraTrailerTemps() {
  const types = 'reeferReturnAirTemperatureMilliCZone1,reeferSetPointTemperatureMilliCZone1,reeferStateZone1';
  const temps = [];
  let after = null;
  do {
    const tempRes = await axios.get(`${SAMSARA_API_BASE_URL}/fleet/trailers/stats`, {
      headers: { 'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`, 'Content-Type': 'application/json' },
      params: { types, ...(after ? { after } : {}) },
      timeout: 15000,
    });
    const data = tempRes.data || {};
    temps.push(...(Array.isArray(data.data) ? data.data : []));
    after = data.pagination?.hasNextPage ? data.pagination.endCursor : null;
  } while (after);
  return temps.map(t => {
    const ret = t.reeferReturnAirTemperatureMilliCZone1;
    const set = t.reeferSetPointTemperatureMilliCZone1;
    const st = t.reeferStateZone1;
    if (!ret && !set && !st) return null;
    return {
      id: t.id,
      name: t.name || '',
      returnC: ret?.value != null ? Math.round(ret.value / 100) / 10 : null,
      setPointC: set?.value != null ? Math.round(set.value / 100) / 10 : null,
      state: st?.value ?? null,
      timeMs: ret?.time ? new Date(ret.time).getTime() : null,
    };
  }).filter(Boolean);
}

let trailerTempsCache = [];
let trailerTempsFetchedAt = 0;
const TRAILER_TEMP_TTL_MS = 60000;

async function getTrailerTempsCached(force = false) {
  if (!force && trailerTempsFetchedAt && Date.now() - trailerTempsFetchedAt < TRAILER_TEMP_TTL_MS) {
    return trailerTempsCache;
  }
  try {
    trailerTempsCache = await fetchSamsaraTrailerTemps();
  } catch (err) {
    console.error('Error al obtener temperatura de trailers Samsara:', err.message);
  }
  trailerTempsFetchedAt = Date.now();
  return trailerTempsCache;
}

function normalizeTrailerNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

function mapTrailerTemp(numero) {
  const num = normalizeTrailerNumber(numero);
  if (!num) return null;
  return trailerTempsCache.find(t => normalizeTrailerNumber(t.name) === num) || null;
}

async function performSamsaraTrailerRefresh() {
  const trailers = await fetchSamsaraTrailerLocations();
  for (const t of trailers) {
    const gps = t.gps;
    if (!gps || !gps.latitude || !gps.longitude) continue;
    const now = Date.now();
    const locTime = new Date(gps.time).getTime();
    await insertTrailerLocation({
      trailer_id: t.id,
      trailer_name: t.name || null,
      latitude: gps.latitude,
      longitude: gps.longitude,
      speed: gps.speed || 0,
      location: gps.reverseGeo?.formattedLocation || '',
      time_ms: locTime,
    });
  }
  await loadTrailerLocationsCache();
  await getTrailerTempsCached(true);
  return trailers;
}

let trailerLocationsCache = [];

function loadTrailerLocationsCache() {
  return listTrailerLocations().then(rows => {
    trailerLocationsCache = rows || [];
    return trailerLocationsCache;
  });
}

function mapTrailerLocation(numero) {
  const num = normalizeTrailerNumber(numero);
  if (!num) return null;
  const row = trailerLocationsCache.find(t => normalizeTrailerNumber(t.trailer_name) === num);
  if (!row) return null;
  const timeDiff = Date.now() - (row.time_ms || 0);
  return {
    trailer_id: row.trailer_id,
    trailer_name: row.trailer_name,
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    location: row.location,
    timeMs: row.time_ms,
    minutesAgo: Math.round(timeDiff / 60000),
    isOnline: !!row.time_ms,
  };
}

async function performSamsaraVehicleRefresh() {
  try {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    let locationsMap = {};
    try {
      const locations = await fetchSamsaraVehicleLocations();

      for (const v of locations) {
        if (v.location) {
          const now = Date.now();
          const locTime = new Date(v.location.time).getTime();
          const timeDiff = now - locTime;
          locationsMap[v.id] = {
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            speed: v.location.speed,
            location: v.location.reverseGeo?.formattedLocation || '',
            timeMs: locTime,
            minutesAgo: Math.round(timeDiff / 60000)
          };

          await saveVehicleLocation({
            vehicle_id: v.id,
            vehicle_name: v.name || null,
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            speed: v.location.speed,
            location: v.location.reverseGeo?.formattedLocation || '',
            time_ms: locTime,
          });

          await insertRouteHistoryPoint({
            vehicle_id: v.id,
            vehicle_name: v.name || null,
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            speed: v.location.speed,
            heading: v.location.heading,
            location: v.location.reverseGeo?.formattedLocation || '',
            source_time_ms: locTime,
          });
        }
      }
    } catch (locErr) {
      console.error('Error fetching locations:', locErr.message);
    }

    const enrichedVehicles = vehicles.map(v => {
      const apiLoc = locationsMap[v.id];

      return {
        ...v,
        location: apiLoc || null,
        isOnline: !!apiLoc,
        hasLocation: !!apiLoc,
        lastSeen: apiLoc ? apiLoc.minutesAgo : null
      };
    });
    return enrichedVehicles;
  } catch (error) {
    console.error('Error Samsara API:', error.message);
    throw error;
  }
}

let samsaraRefreshInFlight = null;
function refreshSamsaraVehicles() {
  if (!samsaraRefreshInFlight) {
    samsaraRefreshInFlight = performSamsaraVehicleRefresh().finally(() => { samsaraRefreshInFlight = null; });
  }
  return samsaraRefreshInFlight;
}

module.exports = {
  samsaraApi,
  fetchSamsaraDrivers,
  syncOperatorToSamsara,
  fetchSamsaraVehicleLocations,
  fetchSamsaraAddresses,
  fetchSamsaraTrailerLocations,
  getTrailerTempsCached,
  mapTrailerTemp,
  performSamsaraTrailerRefresh,
  loadTrailerLocationsCache,
  mapTrailerLocation,
  performSamsaraVehicleRefresh,
  refreshSamsaraVehicles,
};
