'use client';

import { useEffect, useState } from 'react';

export default function MapaUnidades({ vehiculos }) {
  const [MapComponent, setMapComponent] = useState(null);

  useEffect(() => {
    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const MapaInner = () => {
        const [mapRef, setMapRef] = useState(null);

        useEffect(() => {
          if (!mapRef) return;

          const map = L.map(mapRef, { zoomControl: true }).setView([23.6345, -102.5528], 6);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const greenIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const redIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const yellowIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:12px;height:12px;background:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          vehiculos.forEach(v => {
            if (v.location) {
              const isMoving = v.location.speed > 1;
              const icon = isMoving ? greenIcon : redIcon;
              const marker = L.marker([v.location.latitude, v.location.longitude], { icon }).addTo(map);
              marker.bindPopup(`
                <div style="font-family:system-ui;min-width:180px">
                  <strong style="font-size:14px">${v.name}</strong><br/>
                  <span style="color:#666;font-size:12px">${v.location.location || 'Sin dirección'}</span><br/>
                  <div style="margin-top:8px;font-size:12px">
                    <div>Velocidad: <strong>${Math.round(v.location.speed)} mph</strong></div>
                    ${v.odometerMeters ? `<div>Kilometraje: <strong>${(v.odometerMeters / 1000).toFixed(0)} km</strong></div>` : ''}
                    ${v.fuelLevelPercent !== null ? `<div>Combustible: <strong>${Math.round(v.fuelLevelPercent * 100)}%</strong></div>` : ''}
                    <div>Estado: <span style="color:${isMoving ? '#10b981' : '#ef4444'}">${isMoving ? 'En movimiento' : 'Detenido'}</span></div>
                  </div>
                </div>
              `);
            }
          });

          const withLoc = vehiculos.filter(v => v.location);
          if (withLoc.length > 0) {
            const bounds = L.latLngBounds(
              withLoc.map(v => [v.location.latitude, v.location.longitude])
            );
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [30, 30] });
            }
          }

          return () => map.remove();
        }, [mapRef]);

        return (
          <div
            ref={setMapRef}
            style={{ width: '100%', height: '100%', borderRadius: '12px' }}
          />
        );
      };

      setMapComponent(() => MapaInner);
    };

    loadMap();
  }, [vehiculos]);

  if (!MapComponent) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
          <div>Cargando mapa...</div>
        </div>
      </div>
    );
  }

  return <MapComponent />;
}
