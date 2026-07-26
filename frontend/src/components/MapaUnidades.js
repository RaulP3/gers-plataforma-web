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

function drawZone(L, map, z, isCustom) {
  const color = severityColors[z.severity] || '#fb923c';
  const tag = isCustom ? ' | Propia' : '';
  const popupHtml = `
    <div style="font-family:system-ui;min-width:200px">
      <strong style="color:${color}">⚠️ ${z.name}</strong><br/>
      <span style="color:#94a3b8;font-size:11px">${severityLabels[z.severity] || z.severity} | Radio: ${(z.radius / 1000).toFixed(1)} km${tag}</span><br/>
      <div style="margin-top:6px;font-size:12px">${z.description || ''}</div>
    </div>
  `;
  const circle = L.circle([z.lat, z.lng], {
    radius: z.radius, color, fillColor: color, fillOpacity: 0.10, weight: 2,
    dashArray: z.severity === 'critical' ? '8, 4' : '4, 4'
  }).addTo(map);
  circle.bindPopup(popupHtml);

  const sz = z.severity === 'critical' ? 14 : z.severity === 'high' ? 11 : 9;
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;box-shadow:0 0 ${sz}px ${color}"></div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2]
  });
  const marker = L.marker([z.lat, z.lng], { icon }).addTo(map);
  marker.bindPopup(popupHtml);
}

function drawVehicles(L, map, vehiculos, vehicleLayerRef) {
  if (vehicleLayerRef.current) {
    map.removeLayer(vehicleLayerRef.current);
  }
  const group = L.layerGroup().addTo(map);

  const truckIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="font-size:20px;text-shadow:0 0 6px rgba(0,0,0,0.8)">🚛</div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });

  vehiculos.forEach(v => {
    if (v.location) {
      const isMoving = v.location.speed > 1;
      const marker = L.marker([v.location.latitude, v.location.longitude], { icon: truckIcon }).addTo(group);
      marker.bindPopup(`
        <div style="font-family:system-ui;background:#111;color:#e0e0e0;padding:12px;border-radius:8px;min-width:180px">
          <strong style="font-size:14px">${v.name}</strong><br/>
          <span style="color:#6a9b6a;font-size:12px">${v.location.location || 'Sin dirección'}</span><br/>
          <div style="margin-top:8px;font-size:12px">
            <div>Velocidad: <strong>${Math.round(v.location.speed)} km/h</strong></div>
            ${v.fuelLevelPercent !== null ? `<div>Combustible: <strong>${Math.round(v.fuelLevelPercent * 100)}%</strong></div>` : ''}
            <div>Estado: <span style="color:${isMoving ? '#4ade80' : '#f87171'}">${isMoving ? 'En movimiento' : 'Detenido'}</span></div>
          </div>
        </div>
      `);
    }
  });

  vehicleLayerRef.current = group;
}

export default function MapaUnidades({ vehiculos, geofences = [], customRiskZones = [], placingZone = false, onZonePlaced = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const vehicleLayerRef = useRef(null);
  const customGroupRef = useRef(null);
  const geofenceGroupRef = useRef(null);
  const placingRef = useRef(placingZone);
  const onPlacedRef = useRef(onZonePlaced);

  placingRef.current = placingZone;
  onPlacedRef.current = onZonePlaced;

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

      defaultZones.forEach(z => drawZone(L, map, z, false));
      drawVehicles(L, map, vehiculos, vehicleLayerRef);

      const withLoc = vehiculos.filter(v => v.location);
      if (withLoc.length > 0) {
        const bounds = L.latLngBounds(withLoc.map(v => [v.location.latitude, v.location.longitude]));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    drawVehicles(LRef.current, mapRef.current, vehiculos, vehicleLayerRef);
  }, [vehiculos]);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    if (customGroupRef.current) {
      map.removeLayer(customGroupRef.current);
      customGroupRef.current = null;
    }
    if (customRiskZones.length > 0) {
      const group = L.layerGroup().addTo(map);
      customRiskZones.forEach(z => drawZone(L, map, z, true));
      customGroupRef.current = group;
    }
  }, [customRiskZones]);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
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
      const color = g.color || '#3b82f6';
      const srcLabel = g.source === 'samsara' ? ' | Samsara' : '';
      const popupHtml = `
        <div style="font-family:system-ui;min-width:180px">
          <strong style="color:${color}">⭕ ${g.nombre}</strong><br/>
          <span style="color:#94a3b8;font-size:11px">Radio: ${g.radio_metros}m${srcLabel}</span><br/>
          ${g.descripcion ? `<div style="margin-top:4px;font-size:12px">${g.descripcion}</div>` : ''}
        </div>
      `;
      if (g.polygon && g.polygon.vertices && g.polygon.vertices.length > 2) {
        const latlngs = g.polygon.vertices.map(v => [v.latitude, v.longitude]);
        const poly = L.polygon(latlngs, { color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '6, 4' }).addTo(group);
        poly.bindPopup(popupHtml);
      } else if (g.latitud && g.longitud) {
        const circle = L.circle([g.latitud, g.longitud], {
          radius: g.radio_metros, color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: '6, 4'
        }).addTo(group);
        circle.bindPopup(popupHtml);
      }
      if (g.latitud && g.longitud) {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${color}"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5]
        });
        const marker = L.marker([g.latitud, g.longitud], { icon }).addTo(group);
        marker.bindPopup(popupHtml);
      }
      } catch (e) {}
    });
    geofenceGroupRef.current = group;
  }, [geofences]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
  }, [placingZone]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#0a0a0a' }}
    />
  );
}
