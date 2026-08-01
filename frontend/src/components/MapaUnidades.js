'use client';

import { useEffect, useState, useRef } from 'react';

const defaultZones = [
  { name: 'Tamaulipas - Zona Norte', description: 'Alta actividad delictiva en carreteras. Secuestros y robos frecuentes.', severity: 'critical', lat: 25.8811, lng: -97.4981, radius: 80000 },
  { name: 'Guerrero - Costa Grande', description: 'Zona de narcotráfico. Evitar carreteras secundarias.', severity: 'critical', lat: 17.0732, lng: -100.1004, radius: 60000 },
  { name: 'Zacatecas - Carreteras', description: 'Bloqueos frecuentes y emboscadas a vehículos de carga.', severity: 'high', lat: 23.0629, lng: -103.3429, radius: 50000 },
  { name: 'Michoacán - Tierra Caliente', description: 'Violencia entre grupos criminales. Rutas de carga comprometidas.', severity: 'critical', lat: 18.8500, lng: -102.1800, radius: 70000 },
  { name: 'Nuevo León - Periferia', description: 'Robo de mercancía en autopistas concurridas.', severity: 'high', lat: 25.6866, lng: -100.3161, radius: 30000 },
  { name: 'Jalisco - Zona Metropolitana', description: 'Asaltos en caminos rurales. Vigilar rutas alternas.', severity: 'medium', lat: 20.6597, lng: -103.3496, radius: 40000 },
  { name: 'Baja California - Frontera', description: 'Actividad de cruce ilegal y contrabando en zonas fronterizas.', severity: 'high', lat: 32.5149, lng: -116.9983, radius: 25000 },
  { name: 'Sinaloa - Los Mochis', description: 'Operaciones de grupos criminales. Carreteras peligrosas de noche.', severity: 'critical', lat: 25.7900, lng: -109.0000, radius: 45000 },
  { name: 'Sonora - Frontera Sur', description: 'Robo de vehículos en autopistas desoladas.', severity: 'high', lat: 31.2500, lng: -110.9600, radius: 35000 },
  { name: 'Coahuila - Ruta Minera', description: 'Robo de minerales y asaltos a convoyes.', severity: 'medium', lat: 27.5100, lng: -103.0300, radius: 30000 },
  { name: 'Chihuahua - Ciudad Juárez', description: 'Zona urbana de alto riesgo. Secuestros expres.', severity: 'critical', lat: 31.6904, lng: -106.4245, radius: 20000 },
  { name: 'Veracruz - Zona Sur', description: 'Robo de carga en autopistas costeras.', severity: 'high', lat: 18.1500, lng: -94.5000, radius: 40000 },
  { name: 'Tamaulipas - Matamoros', description: 'Control territorial. Evitar traslados nocturnos.', severity: 'critical', lat: 25.8699, lng: -97.5111, radius: 30000 },
  { name: 'Guerrero - Acapulco', description: 'Alta criminalidad urbana. No operar de noche.', severity: 'critical', lat: 16.8531, lng: -99.8237, radius: 25000 },
  { name: 'Oaxaca - Istmo', description: 'Asaltos en carreteras de carga pesada.', severity: 'medium', lat: 16.7500, lng: -95.2000, radius: 35000 },
];

const severityColors = { critical: '#f87171', high: '#fb923c', medium: '#facc15' };
const severityLabels = { critical: 'Crítica', high: 'Alta', medium: 'Media' };
const MPH_TO_KMH = 1.609344;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeColor(value, fallback) {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : fallback;
}

function hasCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function drawZone(L, layer, z, isCustom) {
  if (!hasCoordinates(z.lat, z.lng)) return;
  const color = safeColor(severityColors[z.severity], '#fb923c');
  const radius = Number.isFinite(Number(z.radius)) ? Number(z.radius) : 0;
  const tag = isCustom ? ' | Propia' : '';
  const popupHtml = `
    <div style="font-family:system-ui;min-width:200px">
      <strong style="color:${color}">⚠️ ${escapeHtml(z.name)}</strong><br/>
      <span style="color:#94a3b8;font-size:11px">${escapeHtml(severityLabels[z.severity] || z.severity)} | Radio: ${(radius / 1000).toFixed(1)} km${tag}</span><br/>
      <div style="margin-top:6px;font-size:12px">${escapeHtml(z.description)}</div>
    </div>
  `;
  const circle = L.circle([z.lat, z.lng], {
    radius, color, fillColor: color, fillOpacity: 0.10, weight: 2,
    dashArray: z.severity === 'critical' ? '8, 4' : '4, 4'
  }).addTo(layer);
  circle.bindPopup(popupHtml);

  const sz = z.severity === 'critical' ? 14 : z.severity === 'high' ? 11 : 9;
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;box-shadow:0 0 ${sz}px ${color}"></div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2]
  });
  const marker = L.marker([z.lat, z.lng], { icon }).addTo(layer);
  marker.bindPopup(popupHtml);
}

function drawVehicles(L, map, vehiculos, selectedVehicleId, onVehicleClick, vehicleLayerRef) {
  if (vehicleLayerRef.current) {
    map.removeLayer(vehicleLayerRef.current);
  }
  const group = L.layerGroup().addTo(map);

  const truckIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="font-size:20px;text-shadow:0 0 6px rgba(0,0,0,0.8)">🚛</div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
  const selectedTruckIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:3px solid #00ff41;border-radius:50%;background:#071407;box-shadow:0 0 14px #00ff41;font-size:20px">🚛</div>',
    iconSize: [38, 38], iconAnchor: [19, 19]
  });

  vehiculos.forEach(v => {
    if (v.location && hasCoordinates(v.location.latitude, v.location.longitude)) {
      const rawSpeedMph = Number(v.location.speed);
      const speedKmh = Number.isFinite(rawSpeedMph) ? rawSpeedMph * MPH_TO_KMH : 0;
      const isMoving = speedKmh > 1;
      const fuelLevel = v.fuelLevelPercent == null ? null : Number(v.fuelLevelPercent);
      const hasFuelLevel = Number.isFinite(fuelLevel);
      const isSelected = selectedVehicleId != null && String(v.id) === String(selectedVehicleId);
      const marker = L.marker([v.location.latitude, v.location.longitude], {
        icon: isSelected ? selectedTruckIcon : truckIcon,
        zIndexOffset: isSelected ? 1000 : 0
      }).addTo(group);
      marker.bindPopup(`
        <div style="font-family:system-ui;background:#111;color:#e0e0e0;padding:12px;border-radius:8px;min-width:180px">
          <strong style="font-size:14px">${escapeHtml(v.name)}</strong><br/>
          <span style="color:#6a9b6a;font-size:12px">${escapeHtml(v.location.location || 'Sin dirección')}</span><br/>
          <div style="margin-top:8px;font-size:12px">
            <div>Velocidad: <strong>${Math.round(speedKmh)} km/h</strong></div>
            <div>Combustible: <strong>${hasFuelLevel ? `${Math.round(fuelLevel * 100)}%` : 'N/D'}</strong></div>
            <div>Estado: <span style="color:${isMoving ? '#4ade80' : '#f87171'}">${isMoving ? 'En movimiento' : 'Detenido'}</span></div>
          </div>
        </div>
      `);
      if (onVehicleClick) marker.on('click', () => onVehicleClick(v));
    }
  });

  vehicleLayerRef.current = group;
}

export default function MapaUnidades({ vehiculos, geofences = [], customRiskZones = [], placingZone = false, onZonePlaced = null, routeHistory = [], selectedVehicleId = null, onVehicleClick = null }) {
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const vehiclesRef = useRef(vehiculos);
  const vehicleLayerRef = useRef(null);
  const riskGroupRef = useRef(null);
  const customGroupRef = useRef(null);
  const geofenceGroupRef = useRef(null);
  const routeLayerRef = useRef(null);
  const placingRef = useRef(placingZone);
  const onPlacedRef = useRef(onZonePlaced);

  placingRef.current = placingZone;
  onPlacedRef.current = onZonePlaced;
  vehiclesRef.current = vehiculos;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([23.6345, -102.5528], 6);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
      }).addTo(map);

      const riskGroup = L.layerGroup().addTo(map);
      defaultZones.forEach(z => drawZone(L, riskGroup, z, false));
      riskGroupRef.current = riskGroup;
      drawVehicles(L, map, vehiclesRef.current, selectedVehicleId, onVehicleClick, vehicleLayerRef);

      const withLoc = vehiclesRef.current.filter(v => v.location && hasCoordinates(v.location.latitude, v.location.longitude));
      if (withLoc.length > 0) {
        const bounds = L.latLngBounds(withLoc.map(v => [v.location.latitude, v.location.longitude]));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
      }
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      LRef.current = null;
      vehicleLayerRef.current = null;
      riskGroupRef.current = null;
      customGroupRef.current = null;
      geofenceGroupRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    drawVehicles(LRef.current, mapRef.current, vehiculos, selectedVehicleId, onVehicleClick, vehicleLayerRef);
  }, [mapReady, vehiculos, selectedVehicleId, onVehicleClick]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    if (customGroupRef.current) {
      map.removeLayer(customGroupRef.current);
      customGroupRef.current = null;
    }
    if (customRiskZones.length > 0) {
      const group = L.layerGroup().addTo(map);
      customRiskZones.forEach(z => drawZone(L, group, z, true));
      customGroupRef.current = group;
    }
  }, [customRiskZones, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    if (geofenceGroupRef.current) {
      map.removeLayer(geofenceGroupRef.current);
      geofenceGroupRef.current = null;
    }
    if (geofences.length === 0) return;
    const group = L.layerGroup().addTo(map);
    geofences.filter(g => g.activa).forEach(g => {
      try {
       const color = safeColor(g.color, '#3b82f6');
       const srcLabel = g.source === 'samsara' ? ' | Samsara' : '';
       const radius = Number.isFinite(Number(g.radio_metros)) ? Number(g.radio_metros) : 0;
       const popupHtml = `
         <div style="font-family:system-ui;min-width:180px">
           <strong style="color:${color}">⭕ ${escapeHtml(g.nombre)}</strong><br/>
           <span style="color:#94a3b8;font-size:11px">Radio: ${radius}m${srcLabel}</span><br/>
           ${g.descripcion ? `<div style="margin-top:4px;font-size:12px">${escapeHtml(g.descripcion)}</div>` : ''}
         </div>
       `;
      if (g.polygon && g.polygon.vertices && g.polygon.vertices.length > 2) {
        const latlngs = g.polygon.vertices.map(v => [v.latitude, v.longitude]);
        const poly = L.polygon(latlngs, { color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '6, 4' }).addTo(group);
        poly.bindPopup(popupHtml);
       } else if (hasCoordinates(g.latitud, g.longitud)) {
         const circle = L.circle([g.latitud, g.longitud], {
           radius, color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '6, 4'
         }).addTo(group);
         circle.bindPopup(popupHtml);
       }
       if (hasCoordinates(g.latitud, g.longitud)) {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color}"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5]
        });
        const marker = L.marker([g.latitud, g.longitud], { icon }).addTo(group);
        marker.bindPopup(popupHtml);
      }
       } catch {}
     });
    geofenceGroupRef.current = group;
  }, [geofences, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const handleClick = (e) => {
      if (placingRef.current && onPlacedRef.current) {
        onPlacedRef.current(e.latlng.lat, e.latlng.lng);
      }
    };
    if (placingZone) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleClick);
      return () => { map.off('click', handleClick); map.getContainer().style.cursor = ''; };
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [placingZone, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (!routeHistory || routeHistory.length === 0) return;
    const validStops = routeHistory.filter(p => hasCoordinates(p.latitude, p.longitude));
    const latlngs = validStops.map(p => [p.latitude, p.longitude]);
    if (latlngs.length === 0) return;
    const group = L.layerGroup().addTo(map);
    validStops.forEach((stop, index) => {
      const marker = L.circleMarker(latlngs[index], {
        radius: 7, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.85, weight: 2
      }).addTo(group);
      marker.bindPopup(`<div style="font-family:system-ui"><b style="color:#f59e0b">Parada de ${escapeHtml(stop.stop_duration_minutes)} min</b><br/>${escapeHtml(stop.location || 'Sin dirección')}<br/><span style="font-size:11px;color:#64748b">${escapeHtml(new Date(stop.recorded_at).toLocaleString('es-MX'))}</span></div>`);
    });
    try { map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] }); } catch {}
    routeLayerRef.current = group;
  }, [routeHistory, mapReady]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#0a0a0a' }}
    />
  );
}
