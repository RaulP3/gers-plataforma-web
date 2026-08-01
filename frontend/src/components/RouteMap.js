'use client';

import { useEffect, useRef, useState } from 'react';

const MPH_TO_KMH = 1.609344;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getValidatedPoints(points) {
  return points.reduce((validPoints, point) => {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      validPoints.push({ point, coordinates: [latitude, longitude] });
    }
    return validPoints;
  }, []);
}

export default function RouteMap({ points }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!points || points.length === 0) return;
    let cancelled = false;
    let map = null;
    setLoading(true);

    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: true }).setView([23.6345, -102.5528], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const validPoints = getValidatedPoints(points);
      const coordinates = validPoints.map(({ coordinates: pointCoordinates }) => pointCoordinates);

      if (validPoints.length > 0) {
        const startIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:18px;height:18px;background:#00ff41;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #00ff41"></div>',
          iconSize: [18, 18], iconAnchor: [9, 9]
        });
        const endIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:18px;height:18px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #ef4444"></div>',
          iconSize: [18, 18], iconAnchor: [9, 9]
        });

        const first = validPoints[0];
        const last = validPoints[validPoints.length - 1];
        L.marker(first.coordinates, { icon: startIcon }).addTo(map).bindPopup(`<strong>Inicio</strong><br/>${escapeHtml(first.point.location)}<br/>${escapeHtml(new Date(first.point.recorded_at).toLocaleString())}`);
        L.marker(last.coordinates, { icon: endIcon }).addTo(map).bindPopup(`<strong>Fin</strong><br/>${escapeHtml(last.point.location)}<br/>${escapeHtml(new Date(last.point.recorded_at).toLocaleString())}`);

        if (coordinates.length > 1) {
          L.polyline(coordinates, { color: '#00ff41', weight: 3, opacity: 0.8, dashArray: '10, 5' }).addTo(map);

          const stops = [];
          for (let i = 1; i < validPoints.length; i++) {
            const speedKmh = Number(validPoints[i].point.speed) * MPH_TO_KMH;
            const previousSpeedKmh = Number(validPoints[i - 1].point.speed) * MPH_TO_KMH;
            if (speedKmh < 1 && previousSpeedKmh >= 1) {
              stops.push(validPoints[i].coordinates);
            }
          }
          stops.forEach(c => {
            L.circleMarker(c, { radius: 5, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8 }).addTo(map);
          });
        }

        const bounds = L.latLngBounds(coordinates);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
      setLoading(false);
    };

    loadMap();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points]);

  if (!points || points.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: '12px', border: '1px solid #1a3d1a' }}>
        <div style={{ textAlign: 'center', color: '#4a8a4a' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛤️</div>
          <div>Selecciona vehículo y fecha para ver la ruta</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', borderRadius: '12px', border: '1px solid #1a3d1a' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
      {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a8a4a' }}>Cargando mapa...</div>}
    </div>
  );
}
