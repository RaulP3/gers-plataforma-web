const axios = require('axios');
const { allQuery, runQuery } = require('../db');
const { findGeofenceByNameOrProximity } = require('../models/geofences');

const NAMESPACE_RE = /xmlns\s*=\s*"[^"]*"/g;
const PLACEMARK_RE = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
const NAME_RE = /<name[^>]*>([\s\S]*?)<\/name>/;
const COORDS_RE = /<coordinates[^>]*>([\s\S]*?)<\/coordinates>/;
const POINT_RE = /<Point>[\s\S]*?<\/Point>/;

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function parseKmlPoints(kmlText) {
  const points = [];
  let match;
  PLACEMARK_RE.lastIndex = 0;
  while ((match = PLACEMARK_RE.exec(kmlText)) !== null) {
    const block = match[1];
    if (!POINT_RE.test(block)) continue;
    const coordsMatch = block.match(COORDS_RE);
    if (!coordsMatch) continue;
    const parts = coordsMatch[1].trim().split(/\s+/)[0].split(',');
    const longitud = Number(parts[0]);
    const latitud = Number(parts[1]);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;
    const nameMatch = block.match(NAME_RE);
    points.push({
      nombre: decodeXml(nameMatch ? nameMatch[1] : ''),
      latitud,
      longitud,
    });
  }
  return points;
}

function parseKmlTitle(kmlText) {
  const documentMatch = kmlText.match(/<Document[^>]*>([\s\S]*?)<\/Document>/);
  if (!documentMatch) return '';
  const nameMatch = documentMatch[1].match(NAME_RE);
  return decodeXml(nameMatch ? nameMatch[1] : '');
}

async function fetchMyMapsKml(mid) {
  const url = `https://www.google.com/maps/d/u/0/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
    timeout: 20000,
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 300,
  });
  const text = String(res.data || '');
  if (!text.includes('<Placemark')) {
    throw new Error('El mapa no expone paradas (¿es privado o no tiene puntos?).');
  }
  return text.replace(NAMESPACE_RE, '');
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function matchOrCreateGeofence({ nombre, latitud, longitud }, createdNames) {
  const normalized = normalizeName(nombre);
  if (!normalized) return { nombre: nombre || `Parada ${latitud.toFixed(4)}, ${longitud.toFixed(4)}`, creada: false };
  if (createdNames.has(normalized)) {
    return { nombre, creada: false };
  }
  const existing = await allQuery('SELECT nombre FROM geofences');
  const found = (existing || []).find(row => normalizeName(row.nombre) === normalized);
  if (found) return { nombre: found.nombre, creada: false };
  const proxima = await findGeofenceByNameOrProximity({ nombre, latitud, longitud });
  if (proxima) return { nombre: proxima.nombre, creada: false };
  const nombreFinal = nombre.trim();
  await runQuery(
    'INSERT INTO geofences (nombre, latitud, longitud, radio_metros, descripcion, color, categoria) VALUES (?, ?, ?, 500, ?, ?, ?)',
    [nombreFinal, latitud, longitud, `Geocerca detectada desde Google My Maps (${nombreFinal})`, '#10b981', 'custom']
  );
  createdNames.add(normalized);
  return { nombre: nombreFinal, creada: true };
}

function midFromUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.searchParams.get('mid')?.trim() || '';
  } catch {
    return '';
  }
}

async function detectMapFromUrl(url, createdNames) {
  const mid = midFromUrl(url);
  if (!mid) throw new Error('URL sin parámetro mid');
  const kmlText = await fetchMyMapsKml(mid);
  const points = parseKmlPoints(kmlText);
  if (!points.length) throw new Error('No se encontraron paradas en el mapa');
  const resolved = [];
  for (const point of points) {
    resolved.push(await matchOrCreateGeofence(point, createdNames));
  }
  const origen = resolved[0].nombre;
  const origenNorm = normalizeName(origen);
  const destinos = [];
  const destinosNorm = new Set();
  for (const item of resolved.slice(1)) {
    const norm = normalizeName(item.nombre);
    if (norm && norm !== origenNorm && !destinosNorm.has(norm)) {
      destinosNorm.add(norm);
      destinos.push(item.nombre);
    }
  }
  const tipoEntrega = destinos.length >= 2 ? 'reparto' : 'directo';
  return {
    url,
    mid,
    nombre: parseKmlTitle(kmlText) || `Ruta ${origen} → ${destinos.at(-1) || origen}`,
    origen,
    destinos,
    tipo_entrega: tipoEntrega,
    geocercas_creadas: resolved.filter(item => item.creada).map(item => item.nombre),
  };
}

async function detectMapasFromUrls(urls) {
  const createdNames = new Set();
  const resultados = [];
  const errores = [];
  for (const url of urls) {
    try {
      resultados.push(await detectMapFromUrl(url, createdNames));
    } catch (err) {
      errores.push({ url, error: err.message });
    }
  }
  return { mapas: resultados, errores };
}

module.exports = {
  parseKmlPoints,
  parseKmlTitle,
  fetchMyMapsKml,
  midFromUrl,
  normalizeName,
  detectMapasFromUrls,
};
