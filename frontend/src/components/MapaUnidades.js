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
const ROUTE_PROXIMITY_METERS = 10000;
const BASE_LAYERS = {
  dark: {
    label: 'Oscuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { attribution: '&copy; OSM &copy; CARTO', maxZoom: 19 },
  },
  street: {
    label: 'Calles',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: '&copy; OpenStreetMap', maxZoom: 19 },
  },
  satellite: {
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { attribution: 'Tiles &copy; Esri', maxZoom: 19 },
  },
  terrain: {
    label: 'Relieve',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { attribution: 'Map data &copy; OpenStreetMap, SRTM | Map style &copy; OpenTopoMap', maxZoom: 17 },
  },
};

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

function distanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = value => Number(value) * Math.PI / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isAreaNearRoute(area, routeHistory) {
  const routePoints = (routeHistory || []).filter(point => hasCoordinates(point.latitude, point.longitude));
  if (routePoints.length === 0) return false;
  const vertices = Array.isArray(area?.polygon?.vertices) ? area.polygon.vertices : [];
  const areaPoints = vertices.filter(point => hasCoordinates(point.latitude, point.longitude));
  const centerLatitude = area?.latitud ?? area?.lat;
  const centerLongitude = area?.longitud ?? area?.lng;
  if (hasCoordinates(centerLatitude, centerLongitude)) areaPoints.push({ latitude: centerLatitude, longitude: centerLongitude });
  if (vertices.length > 2) {
    const validVertices = vertices.filter(point => hasCoordinates(point.latitude, point.longitude));
    if (validVertices.length > 0) {
      areaPoints.push({
        latitude: validVertices.reduce((sum, point) => sum + Number(point.latitude), 0) / validVertices.length,
        longitude: validVertices.reduce((sum, point) => sum + Number(point.longitude), 0) / validVertices.length,
      });
    }
  }
  const radius = Math.max(0, Number(area?.radio_metros ?? area?.radius) || 0);
  return areaPoints.some(areaPoint => routePoints.some(routePoint =>
    distanceMeters(areaPoint.latitude, areaPoint.longitude, routePoint.latitude, routePoint.longitude) <= ROUTE_PROXIMITY_METERS + radius
  ));
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

function drawVehicles(L, map, vehiculos, selectedVehicleId, onVehicleClick, vehicleLayerRef, visible) {
  if (vehicleLayerRef.current) {
    map.removeLayer(vehicleLayerRef.current);
  }
  const group = L.layerGroup();
  if (visible) group.addTo(map);

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

  const visibleVehicles = selectedVehicleId == null
    ? vehiculos
    : vehiculos.filter(vehicle => String(vehicle.id) === String(selectedVehicleId));
  visibleVehicles.forEach(v => {
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

export default function MapaUnidades({ vehiculos, geofences = [], customRiskZones = [], placingZone = false, onZonePlaced = null, routeHistory = [], routeStops = [], selectedVehicleId = null, onVehicleClick = null }) {
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState('dark');
  const [showLayers, setShowLayers] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({
    vehicles: true,
    manualGeofences: true,
    catalogGeofences: true,
    samsaraGeofences: true,
    riskZones: true,
    route: true,
    stops: true,
  });
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const baseLayerRef = useRef(null);
  const vehiclesRef = useRef(vehiculos);
  const vehicleLayerRef = useRef(null);
  const riskGroupRef = useRef(null);
  const customGroupRef = useRef(null);
  const manualGeofenceGroupRef = useRef(null);
  const catalogGeofenceGroupRef = useRef(null);
  const samsaraGeofenceGroupRef = useRef(null);
  const routeLayerRef = useRef(null);
  const stopLayerRef = useRef(null);
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

      const initialBase = BASE_LAYERS.dark;
      baseLayerRef.current = L.tileLayer(initialBase.url, initialBase.options).addTo(map);

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
      baseLayerRef.current = null;
      vehicleLayerRef.current = null;
      riskGroupRef.current = null;
      customGroupRef.current = null;
      manualGeofenceGroupRef.current = null;
      catalogGeofenceGroupRef.current = null;
      samsaraGeofenceGroupRef.current = null;
      routeLayerRef.current = null;
      stopLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const definition = BASE_LAYERS[baseLayer] || BASE_LAYERS.dark;
    if (baseLayerRef.current) mapRef.current.removeLayer(baseLayerRef.current);
    baseLayerRef.current = LRef.current.tileLayer(definition.url, definition.options).addTo(mapRef.current);
    baseLayerRef.current.bringToBack();
  }, [baseLayer, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    drawVehicles(LRef.current, mapRef.current, vehiculos, selectedVehicleId, onVehicleClick, vehicleLayerRef, visibleLayers.vehicles);
    if (selectedVehicleId != null && routeHistory.length === 0) {
      const selectedVehicle = vehiculos.find(vehicle => String(vehicle.id) === String(selectedVehicleId));
      if (selectedVehicle?.location && hasCoordinates(selectedVehicle.location.latitude, selectedVehicle.location.longitude)) {
        mapRef.current.setView([selectedVehicle.location.latitude, selectedVehicle.location.longitude], 10);
      }
    }
  }, [mapReady, vehiculos, selectedVehicleId, onVehicleClick, routeHistory.length, visibleLayers.vehicles]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    if (riskGroupRef.current) map.removeLayer(riskGroupRef.current);
    const group = LRef.current.layerGroup();
    if (visibleLayers.riskZones) group.addTo(map);
    const visibleZones = selectedVehicleId == null
      ? defaultZones
      : defaultZones.filter(zone => isAreaNearRoute(zone, routeHistory));
    visibleZones.forEach(zone => drawZone(LRef.current, group, zone, false));
    riskGroupRef.current = group;
  }, [mapReady, selectedVehicleId, routeHistory, visibleLayers.riskZones]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    if (customGroupRef.current) {
      map.removeLayer(customGroupRef.current);
      customGroupRef.current = null;
    }
    const visibleCustomZones = selectedVehicleId == null
      ? customRiskZones
      : customRiskZones.filter(zone => isAreaNearRoute(zone, routeHistory));
    if (visibleCustomZones.length > 0) {
      const group = L.layerGroup();
      if (visibleLayers.riskZones) group.addTo(map);
      visibleCustomZones.forEach(z => drawZone(L, group, z, true));
      customGroupRef.current = group;
    }
  }, [customRiskZones, mapReady, selectedVehicleId, routeHistory, visibleLayers.riskZones]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const map = mapRef.current;
    const L = LRef.current;
    const groupDefinitions = [
      { ref: manualGeofenceGroupRef, visible: visibleLayers.manualGeofences, filter: g => g.source !== 'samsara' && (!g.categoria || g.categoria === 'custom') },
      { ref: catalogGeofenceGroupRef, visible: visibleLayers.catalogGeofences, filter: g => g.source !== 'samsara' && g.categoria && g.categoria !== 'custom' },
      { ref: samsaraGeofenceGroupRef, visible: visibleLayers.samsaraGeofences, filter: g => g.source === 'samsara' },
    ];
    groupDefinitions.forEach(definition => {
      if (definition.ref.current) map.removeLayer(definition.ref.current);
      definition.ref.current = null;
    });
    if (geofences.length === 0) return;
    const visibleGeofences = geofences.filter(g => g.activa !== 0 && (selectedVehicleId == null || isAreaNearRoute(g, routeHistory)));
    const drawGeofence = (g, group) => {
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
    };
    groupDefinitions.forEach(definition => {
      const group = L.layerGroup();
      visibleGeofences.filter(definition.filter).forEach(g => drawGeofence(g, group));
      if (definition.visible) group.addTo(map);
      definition.ref.current = group;
    });
  }, [geofences, mapReady, selectedVehicleId, routeHistory, visibleLayers.manualGeofences, visibleLayers.catalogGeofences, visibleLayers.samsaraGeofences]);

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
    if (stopLayerRef.current) {
      map.removeLayer(stopLayerRef.current);
      stopLayerRef.current = null;
    }
    const validRoute = (routeHistory || []).filter(p => hasCoordinates(p.latitude, p.longitude));
    const validStops = (routeStops || []).filter(p => hasCoordinates(p.latitude, p.longitude));
    const routeLatlngs = validRoute.map(p => [p.latitude, p.longitude]);
    const stopLatlngs = validStops.map(p => [p.latitude, p.longitude]);
    if (routeLatlngs.length === 0 && stopLatlngs.length === 0) return;
    const routeGroup = L.layerGroup();
    const stopGroup = L.layerGroup();
    if (visibleLayers.route) routeGroup.addTo(map);
    if (visibleLayers.stops) stopGroup.addTo(map);
    if (routeLatlngs.length > 1) {
      L.polyline(routeLatlngs, { color: '#00ff41', weight: 4, opacity: 0.8 }).addTo(routeGroup);
    }
    validStops.forEach((stop, index) => {
      const marker = L.circleMarker(stopLatlngs[index], {
        radius: 7, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.85, weight: 2
      }).addTo(stopGroup);
      marker.bindPopup(`<div style="font-family:system-ui"><b style="color:#f59e0b">Parada de ${escapeHtml(stop.stop_duration_minutes)} min</b><br/>${escapeHtml(stop.location || 'Sin dirección')}<br/><span style="font-size:11px;color:#64748b">${escapeHtml(new Date(stop.recorded_at).toLocaleString('es-MX'))}</span></div>`);
    });
    try { map.fitBounds(L.latLngBounds(routeLatlngs.length > 0 ? routeLatlngs : stopLatlngs), { padding: [50, 50] }); } catch {}
    routeLayerRef.current = routeGroup;
    stopLayerRef.current = stopGroup;
  }, [routeHistory, routeStops, mapReady, visibleLayers.route, visibleLayers.stops]);

  const toggleLayer = key => {
    setVisibleLayers(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#0a0a0a' }}
      />
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', fontFamily: 'system-ui' }}>
        <button
          type="button"
          aria-expanded={showLayers}
          onClick={() => setShowLayers(value => !value)}
          style={{ border: '1px solid #285b35', borderRadius: '8px', background: '#071407ee', color: '#d7ffe0', padding: '7px 10px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 5px 18px rgba(0,0,0,0.35)' }}
        >
          Capas
        </button>
        {showLayers && (
          <div style={{ width: 'min(240px, calc(100vw - 40px))', maxHeight: 'min(520px, calc(100vh - 150px))', overflowY: 'auto', border: '1px solid #285b35', borderRadius: '10px', background: '#071407f5', color: '#d7ffe0', padding: '10px 12px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
            <div style={{ color: '#72d98a', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Mapa base</div>
            {Object.entries(BASE_LAYERS).map(([key, definition]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input type="radio" name="map-base-layer" checked={baseLayer === key} onChange={() => setBaseLayer(key)} />
                {definition.label}
              </label>
            ))}
            <div style={{ height: '1px', background: '#1c4325', margin: '9px 0' }} />
            <div style={{ color: '#72d98a', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Operación</div>
            {[
              ['vehicles', 'Unidades'],
              ['manualGeofences', 'Geocercas manuales'],
              ['catalogGeofences', 'Geocercas predefinidas'],
              ['samsaraGeofences', 'Geocercas Samsara'],
              ['riskZones', 'Zonas de riesgo'],
              ['route', 'Recorrido real'],
              ['stops', 'Paradas detectadas'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input type="checkbox" checked={visibleLayers[key]} onChange={() => toggleLayer(key)} />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
