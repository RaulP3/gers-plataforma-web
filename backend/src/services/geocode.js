const axios = require('axios');
const { GEOCODE_CACHE_MAX_ENTRIES, GEOCODE_CACHE_TTL_MS } = require('../config');
const { normalizeDestination } = require('../utils');

const geocodeCache = new Map();

function getCachedGeocode(key) {
  const cached = geocodeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > GEOCODE_CACHE_TTL_MS) {
    geocodeCache.delete(key);
    return null;
  }
  geocodeCache.delete(key);
  geocodeCache.set(key, cached);
  return cached.value;
}

function cacheGeocode(key, value) {
  geocodeCache.set(key, { value, cachedAt: Date.now() });
  if (geocodeCache.size > GEOCODE_CACHE_MAX_ENTRIES) {
    geocodeCache.delete(geocodeCache.keys().next().value);
  }
}

function parseCoordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

async function geocodeAddress(address) {
  const cacheKey = normalizeDestination(address);
  const cached = getCachedGeocode(cacheKey);
  if (cached) return cached;
  const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: address, format: 'jsonv2', limit: 1 },
    headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
    timeout: 15000,
  });
  const first = Array.isArray(geoRes.data) ? geoRes.data[0] : null;
  if (!first) return null;
  const lat = parseCoordinate(first.lat, -90, 90);
  const lon = parseCoordinate(first.lon, -180, 180);
  if (lat === null || lon === null) throw new Error('Nominatim devolvió coordenadas inválidas');
  const result = { nombre: first.display_name || first.name || address, lat, lon };
  cacheGeocode(cacheKey, result);
  return result;
}

async function calculateRoute({ destino, origen, lat_origen, lon_origen, lat_destino, lon_destino }) {
  const destination = typeof destino === 'string' ? destino.trim().replace(/\s+/g, ' ') : '';
  const origin = typeof origen === 'string' ? origen.trim().replace(/\s+/g, ' ') : '';
  let latOrigin = parseCoordinate(lat_origen, -90, 90);
  let lonOrigin = parseCoordinate(lon_origen, -180, 180);
  const latDestination = parseCoordinate(lat_destino, -90, 90);
  const lonDestination = parseCoordinate(lon_destino, -180, 180);
  if (!destination || destination.length > 300) {
    const error = new Error('destino es requerido y debe tener máximo 300 caracteres');
    error.status = 400;
    throw error;
  }
  if ((latOrigin === null || lonOrigin === null) && (!origin || origin.length > 300)) {
    const error = new Error('Se requieren coordenadas válidas o una dirección de origen');
    error.status = 400;
    throw error;
  }

  const [destinationLocation, originLocation] = await Promise.all([
    latDestination !== null && lonDestination !== null
      ? Promise.resolve({ nombre: destination, lat: latDestination, lon: lonDestination })
      : geocodeAddress(destination),
    latOrigin === null || lonOrigin === null ? geocodeAddress(origin) : Promise.resolve(null),
  ]);
  if (!destinationLocation) {
    const error = new Error('No se encontró el destino');
    error.status = 404;
    throw error;
  }
  if (originLocation) {
    latOrigin = originLocation.lat;
    lonOrigin = originLocation.lon;
  }
  if (latOrigin === null || lonOrigin === null) {
    const error = new Error('No se encontró el origen');
    error.status = 404;
    throw error;
  }

  const routeRes = await axios.get(
    `https://router.project-osrm.org/route/v1/driving/${lonOrigin},${latOrigin};${destinationLocation.lon},${destinationLocation.lat}`,
    {
      params: { overview: 'false', alternatives: 'false', steps: 'false' },
      headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
      timeout: 15000,
    }
  );
  const route = routeRes.data?.routes?.[0];
  if (routeRes.data?.code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
    const error = new Error('No se pudo calcular una ruta para el destino');
    error.status = 422;
    throw error;
  }
  return {
    origen: originLocation,
    destino: destinationLocation,
    distancia_metros: route.distance,
    duracion_segundos: route.duration,
  };
}

function validMyMapsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    return ['http:', 'https:'].includes(parsed.protocol) && (
      host === 'google.com' || host.endsWith('.google.com') ||
      host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com')
    );
  } catch {
    return false;
  }
}

module.exports = {
  parseCoordinate,
  geocodeAddress,
  calculateRoute,
  validMyMapsUrl,
};
