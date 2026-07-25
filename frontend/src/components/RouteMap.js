'use client';

import { useEffect, useState } from 'react';

export default function RouteMap({ points }) {
  const [MapComponent, setMapComponent] = useState(null);

  useEffect(() => {
    if (!points || points.length === 0) return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const MapInner = () => {
        const [mapRef, setMapRef] = useState(null);

        useEffect(() => {
          if (!mapRef || !points.length) return;

          const map = L.map(mapRef, { zoomControl: true }).setView([23.6345, -102.5528], 6);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const coords = points.map(p => [p.latitude, p.longitude]).filter(c => c[0] && c[1]);
          if (coords.length === 0) return;

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

          L.marker(coords[0], { icon: startIcon }).addTo(map).bindPopup(`<strong>Inicio</strong><br/>${points[0].location || ''}<br/>${new Date(points[0].recorded_at).toLocaleString()}`);
          L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map).bindPopup(`<strong>Fin</strong><br/>${points[points.length - 1].location || ''}<br/>${new Date(points[points.length - 1].recorded_at).toLocaleString()}`);

          if (coords.length > 1) {
            const polyline = L.polyline(coords, { color: '#00ff41', weight: 3, opacity: 0.8, dashArray: '10, 5' }).addTo(map);

            const stops = [];
            for (let i = 1; i < points.length; i++) {
              if (points[i].speed < 1 && points[i - 1].speed >= 1) {
                stops.push(coords[i]);
              }
            }
            stops.forEach(c => {
              L.circleMarker(c, { radius: 5, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8 }).addTo(map);
            });
          }

          const bounds = L.latLngBounds(coords);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30] });
          }

          return () => map.remove();
        }, [mapRef]);

        return <div ref={setMapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />;
      };

      setMapComponent(() => MapInner);
    };

    loadMap();
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

  if (!MapComponent) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: '12px', border: '1px solid #1a3d1a' }}>
        <div style={{ textAlign: 'center', color: '#4a8a4a' }}>Cargando mapa...</div>
      </div>
    );
  }

  return <MapComponent />;
}
